const fs = require('fs');
const sqlstring = require ("sqlstring");
const hash = require('object-hash');

export interface ObjectListener<T> {
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
 * Listener is a function that takes in an ObjectListener to the constructor function of Object of type T.
 */
export function Listener<I extends ObjectListener<any>>(listener: I) {

    return function <T extends {new(...constructorArgs: any[]) }>(constructorFunction: T) {
        //new constructor function
        let extendedConstructorFunction = class extends constructorFunction{
            // We add a discreet orm id with a default value of the empty string.
            private discreet_orm_id = "";
        } 
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
        return newConstructorFunction;
    }
}

/** Decorator to be applied to static functions that return a databased backed object. 
 *  Takes the result of the function call and deletes the existing DB object and replaces it
 *  with the new result. Associates DB objects by the secret field 'discreet_orm_id'. 
 */
export function WriteToDB(discreet_sql_io : DiscreetORMIO){
    return function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const original_function = descriptor.value;
        
        descriptor.value = function(... args: any[]) {
            let result = original_function.apply(this, args);
            let result_table_name = result.constructor.name;
            let reference_id = result.discreet_orm_id;
            let delete_row_template = 'DELETE FROM ?? WHERE ??;'
            // DELETE FROM table_name WHERE discreet_orm_id = <reference_id>
            // addRow(result, discreet_sql_io) 
            let escaped_command = sqlstring.format(delete_row_template, [result_table_name, ("discreet_orm_id = " + reference_id)]);
            discreet_sql_io.writeSQL(escaped_command);
            addRow(result, discreet_sql_io);    
        }

        return descriptor;
    }
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
                if (attribute === "discreet_orm_id"){
                    // We want to ignore the secreet discreet_orm_id, since discreet_orm_id is already hardcoded in.
                    continue;
                }
                vals_list.push(obj[attribute]); 
                add_row_template += ", ?";
            }
            add_row_template +=");"
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
        let create_table_template = 'CREATE TABLE ?? (discreet_orm_id VARCHAR(255), ??);';

        // create an array of column name-type strings
        let cols = new Array<string>(keys.length);
        for (let i = 0; i < keys.length; i++) {
            if (keys[i] === "discreet_orm_id"){
                // We want to ignore the secreet discreet_orm_id, since discreet_orm_id is already hardcoded in.
                continue;
            }
            let sql_type = this.tsTypeToSQLType(obj[keys[i]].constructor.name);
            cols[i] = `${keys[i]} ${sql_type}`;
        }

        // escape all the user-generated column name strings
        let escaped_command = sqlstring.format(create_table_template, [table_name, cols]);
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

    tsTypeToSQLType(ts_type : String) : String{
        switch (ts_type) {
            case "String": {
                return "VARCHAR(255)";
            }
            case "Number" : {
                return "INT(255)"
            }
            case "number" : {
                return "INT(255)"
            }
            default : {
                return "VARCHAR(255)"
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
