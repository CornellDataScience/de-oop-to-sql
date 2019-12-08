import { relative } from "path";

const fs = require('fs');
const sqlstring = require ("sqlstring");
const hash = require('object-hash');

export interface ObjectListener<T> {
    discreet_sql_io : DiscreetORMIO;
    onObjectCreation(t: T): void;
}

/**
 * DiscreetORMIO defines a location to write SQL commands to. 
 * A single instance of a DiscreetORMIO object is associated with 
 * a single database. 
 */
export class DiscreetORMIO {
    sql_filepath : string;
    tlist_filepath : string;
    FILE_ENCODING = 'utf8';
    FILE_NOT_FOUND_ERROR_IDENT = 'no such';

    constructor(sql_path : string, tlist_path : string) {
        this.sql_filepath = sql_path;
        this.tlist_filepath = tlist_path;
    }

    readTables() : string[] {
        let tables_contents = '';

        try {
            tables_contents = <string> fs.readFileSync(this.tlist_filepath, this.FILE_ENCODING);
        } catch (e) {
            if (e.message.includes(this.FILE_NOT_FOUND_ERROR_IDENT)) {
                return []
            }
            throw e;
        }
        return tables_contents.split("\n");
    }

    writeSQL(output : string) : void {
        let formatted_output = '\n' + output;
        let buffer = Buffer.from(formatted_output);
        try {
            fs.appendFileSync(this.sql_filepath, buffer);
            console.log('Wrote SQL commands to commands file.');
        } catch (e) {
            throw 'DiscreetORM SQL Table write error. Could not write to file: ' + e;
        }
    }

    writeNewTable(table_name : string) : void {
        let formatted_output = '\n' + table_name;
        let buffer = Buffer.alloc(formatted_output.length, formatted_output);

        try {
            fs.appendFileSync(this.tlist_filepath, buffer);
            console.log('Wrote SQL table to tables file.');
        } catch (e) {
            throw 'DiscreetORM SQL Table write error. Could not write to file: ' + e;
        }
    }
    
}

/**
 * deleteFromDatabase(delete_target : T, discreet_sql_io) removes the object delete_target from
 * the database connected to discreet_sql_io. 
 * Precondition: The database connected to discreet_sql_io has a table for the type T of delete 
 * target. 
 * @param delete_target 
 * @param discreet_sql_io 
 */
export function deleteFromDatabase<T> (delete_target : T, discreet_sql_io : DiscreetORMIO) {
    let result_table_name = <string> delete_target.constructor.name;
    // @ts-ignore
    let reference_id = <string> delete_target.discreet_orm_id;
    let delete_row_template = 'DELETE FROM ?? WHERE ??;'

    let escaped_command = sqlstring.format(delete_row_template, [result_table_name, ("discreet_orm_id = " + reference_id)]);
    discreet_sql_io.writeSQL(escaped_command);   
    return; 
}

/** 
 * Listener is a function that takes in an ObjectListener to the constructor function of Object of type T.
 */
export function Listener<I extends ObjectListener<any>>(listener: I) {

    return function <T extends {new(...constructorArgs: any[]) }>(constructorFunction: T) {
        //new constructor function
        let keys = Object.keys(constructorFunction);
        let extendedConstructorFunction = class extends constructorFunction{
            // We add a discreet orm id with a default value of the empty string.
            private discreet_orm_id = "";
        };
        extendedConstructorFunction.prototype = constructorFunction.prototype;
        let newConstructorFunction: any = function (...args) {
            let func: any = function () {
                return new extendedConstructorFunction(...args);
            };
            func.prototype = extendedConstructorFunction.prototype;
            let result: any = new func();
            listener.onObjectCreation(result);
            return result;
        };
        newConstructorFunction.prototype = extendedConstructorFunction.prototype;
        keys.forEach(function (value) {
            newConstructorFunction[value] = constructorFunction[value];
        });
        return newConstructorFunction;
    }
}

/**
 * Convenience method for writing new rows or row modifications into the database
 *
 * @param toWrite
 * @param discreet_sql_io
 */
function writeToDB(toWrite: any, discreet_sql_io : DiscreetORMIO) {
    let result_table_name = toWrite.constructor.name;
    let reference_id = toWrite.discreet_orm_id;
        // TODO: maybe we should change this to an update or insert instead of a delete?
    let delete_row_template = 'DELETE FROM ?? WHERE ??;';
    console.log([result_table_name, ("discreet_orm_id = " + reference_id)]);
    let escaped_command = sqlstring.format(delete_row_template, [result_table_name, ("discreet_orm_id = " + reference_id)]);
    discreet_sql_io.writeSQL(escaped_command);
    addRow(toWrite, discreet_sql_io);
}

/** Method decorator to be applied to methods that return a databased backed object.
 *  Takes the result of the function call and deletes the existing DB object and replaces it
 *  with the new result. Associates DB objects by the secret field 'discreet_orm_id'. 
 * 
 * To be used on methods that returns a modified object
 * Note: Will most likely be used on static methods
 */
export function WriteReturnToDB(discreet_sql_io : DiscreetORMIO){
    return function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const original_function = descriptor.value;

        descriptor.value = function(... args: any[]) {
            let result = original_function.apply(this, args);
            writeToDB(result, discreet_sql_io); // write the state of the mutated object
            return result;
        };

        return descriptor;
    }
}

/**
 * Decorator to be applied to instance functions operating on a database backed object. Updates the object's
 * corresponding tuple in the database.
 *
 * @param discreet_sql_io
 * @constructor
 */
export function InstanceListener(discreet_sql_io : DiscreetORMIO){
    return function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const original_function = descriptor.value;
        
        descriptor.value = function(... args: any[]) {
            let result = original_function.apply(this, args);
            writeToDB(this, discreet_sql_io); // write the state of the mutated object
            return result;    
        };

        return descriptor;
    }
}
/** Method decorator to be applied to functions that modify a databased backed object, in place. 
 *  Executes the function, modifying the object. The object's existing DB record is deleted and 
 * replaced with the modified result of the function. Associates DB objects by the secret field 'discreet_orm_id'. 
 * 
 * To be used on methods that modifies object in place (generall)
 * Note: Will generally be used on dynamic methods of the class
 */
export function WriteModifiedToDB(discreet_sql_io : DiscreetORMIO){
    return function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const original_function = descriptor.value;
        
        descriptor.value = function(... args: any[]) {
            const binded_original_function = original_function.bind(this)
            let result = binded_original_function(args)
            let result_table_name = this.constructor.name
            let reference_id = this['discreet_orm_id'];
            let delete_row_template = 'DELETE FROM ?? WHERE ??;'
            let escaped_command = sqlstring.format(delete_row_template, [result_table_name, ("discreet_orm_id = " + reference_id)]);
            discreet_sql_io.writeSQL(escaped_command);
            addRow(this, discreet_sql_io);
            return result;    
        }
        return descriptor;
    }
}

export function attributeDecorator(discreet_sql_io : DiscreetORMIO){ 
    let attrib = "attribute"
    return function(target: any, key: string | symbol){
        let newVal = {"propertyName": key,
                     "propertyType" : typeof(key)} //#TODO: need to decide what items to store
        if (Reflect.hasOwnMetadata(attrib, target)) {
            let value = Reflect.getOwnMetadata(attrib, target)
            value.push(newVal)
            return Reflect.defineMetadata(attrib, value, target)
        }   
        else {
            return Reflect.defineMetadata(attrib, [newVal], target) 
        }
    } 
}

export function methodDecorator(discreet_sql_io : DiscreetORMIO) {

}

/**
 * addRow(obj, discreet_sql_io) adds the fields of obj to the DB. 
 * Precondition: The class of obj must already have an associated table. 
 * Does not add the hidden field 'discreet_orm_id' to the DB. 
 * @param obj is the database-backed objected whose information is added to the DB.
 * @param discreet_sql_io is the SQL interface.
 */
function addRow(obj: any, discreet_sql_io : DiscreetORMIO) : void {
    let add_row_template = "INSERT INTO ? VALUES (?";
    obj.discreet_orm_id = hash(obj);
    let obj_hash = obj.discreet_orm_id;
    let vals_list = [obj.constructor.name,  obj_hash];
    for (let attribute of Object.keys(obj)){
            // TODO: Object writing is a big feature so we need it in a separate feature
        if(typeof(obj[attribute]) != "function" && typeof(obj[attribute]) != "undefined" && typeof(obj[attribute]) != "object") {
            if (attribute === "discreet_orm_id"){
             // We want to ignore the secreet discreet_orm_id, since discreet_orm_id is already hardcoded in.
                continue;
            }
            vals_list.push(obj[attribute]); 
            add_row_template += ", ?";
        }
    }
    add_row_template +=");";
    let escaped_command = sqlstring.format(add_row_template,vals_list);
    discreet_sql_io.writeSQL(escaped_command);            
    console.log(escaped_command);
}

/**
 * The StoredClass ObjectListener is applied to any class, through Listener, who's instantiated 
 * objects should be backed in the DB associated with the DiscreetORMIO passed
 * into the constructor.
 */
export class StoredClass implements ObjectListener<any>{
    discreet_sql_io : DiscreetORMIO;

    constructor(sql_out : DiscreetORMIO) {
        this.discreet_sql_io = sql_out;
    }

    createNewTable(obj: any) : void {
        let table_name = obj.constructor.name;
        let keys = Object.keys(obj);
        // create an array of column name-type strings
        let args = new Array(1);
        args[0] = table_name;
        //used to keep track of the actual 'real' attributes 
        var count = 0;
        for (let i = 0; i < keys.length; i++) {
            if(typeof(obj[keys[i]]) != "function" && typeof(obj[keys[i]]) != "undefined" && typeof(obj[keys[i]]) != "object") {
                // We want to ignore the secret discreet_orm_id, since discreet_orm_id is already hardcoded in.
                if (keys[i] != "discreet_orm_id"){
                    args.push(keys[i])
                    args.push(this.tsTypeToSQLType(obj[keys[i]].constructor.name))
                    count++;
                }
            }
        }
        // escape all the user-generated column name strings
        let qmark_arr = new Array<String>(count);
        qmark_arr.fill('?? ?');
        let qmark_str = qmark_arr.join(',');
        let create_table_template = `CREATE TABLE ?? (orm_id INT(255), ${qmark_str});`;
        let escaped_command = sqlstring.format(create_table_template, args);
        console.log(escaped_command);
        this.discreet_sql_io.writeSQL(escaped_command);
        this.discreet_sql_io.writeNewTable(table_name);
    }
    
    onObjectCreation(obj: any) {
        let table_name = obj.constructor.name;
        if (!this.discreet_sql_io.readTables().includes(table_name)){
            this.createNewTable(obj);
        }
        
        addRow(obj, this.discreet_sql_io);
    }

    tsTypeToSQLType(ts_type : String) : Buffer{
        switch (ts_type) {
            case "String": {
                return sqlstring.raw("VARCHAR(255)");
            }
            case "Number" : {
                return sqlstring.raw("INT(255)");
            }
            case "number" : {
                return sqlstring.raw("INT(255)");
            }
            default : {
                return sqlstring.raw("VARCHAR(255)");
            }
        }
    }
}

// Configuration Options: 
let command_out = 'output/commands.sql';
let table_lst = 'output/tables.tlst';

export const SQL_IO = new DiscreetORMIO(command_out, table_lst);

// Applied on an example. 
@Listener(new StoredClass(SQL_IO))
class TaskRunner {
    taskName: string;
	taskStatus : string; 
    taskId : Number;
    constructor(taskName: string) {
        this.taskName = taskName;
		this.taskStatus = 'incomplete';
        this.taskId = 0;
    }
	f(number: Number) {
		return number; 
	}
}
