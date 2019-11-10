const fs = require('fs');
const sqlstring = require ("sqlstring");
const hash = require('object-hash');
const mysql = require('mysql');

export interface ObjectListener<T> {
    discreet_sql_io : DiscreetORMIO;
    onObjectCreation(t: T): void;
}

export type DBRowResult = Array<string>;

/**
 * DiscreetORMIO defines a location to write SQL commands to. 
 * A single instance of a DiscreetORMIO object is associated with 
 * a single database. 
 */
export interface DiscreetORMIO {
    readTables() : string [];
    writeSQL(output: string): void;
    writeNewTable(table_name : string) : void;
    readFromDB(command : string) : Array<DBRowResult>;
    reconstructObj<T> (entry : DBRowResult) : T;
    updateOrDeleteRow(queryString : string ) : void;
}

/** 
 * [command] is the type for sql commands.
 */
export type command = string

export class DatabaseORMIO implements DiscreetORMIO {
    sql_filepath : string;
    tlist_filepath : string;
    mysql_conn : any;
    FILE_ENCODING = 'utf8';
    FILE_NOT_FOUND_ERROR_IDENT = 'no such';

    constructor(sql_path : string, tlist_path : string, mysql_conn : any) {
        this.sql_filepath = sql_path;
        this.tlist_filepath = tlist_path;
        this.mysql_conn = mysql_conn;
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

    /**
     * Executes the passed update statement
     *
     * TODO: refactor update query building functionality into here?
     * @param queryString the escaped SQL update or delte query
     */
    updateOrDeleteRow(queryString : string ) : void {
        let result = this.mysql_conn.query(queryString);
        console.log(result);
    }

    /**
     * Executes a provided INSERT statement, and returns the auto increment primary key of the inserted record
     *
     * @param insertString
     */
    insertRow(insertString : string ) : void {

        // currently no way to extract results here
        this.mysql_conn.query('INSERT INTO posts SET ?', function (error, results, fields) {
            if (error) throw error;
            console.log("inserted ID is: " + results.insertId);

        });
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

    /** 
     * readFromDB(class_name : string, discreet_sql_io) passes the class name into the database
     * and returns an array of type DBRowResult (which is an array of strings), populated with 
     * entries of objects as specified in the command string.
    */
    readFromDB(class_name : string) : Array<DBRowResult> {
        let escaped_command = sqlstring.format("SELECT * FROM ?", class_name);
        let output: Array<DBRowResult>
        try {
            // Need code that parses the command and returns the result as DBRowResult
            // For loop: store each DBRowResult into a single index of output
            console.log(escaped_command)
        } catch (e) {
            throw e
        }
        return output
    }
    
    /** 
     * reconstructObj(entry : DBRowResult) creates an object of type T from a row 
     * entry of that corresponding class database and returns it.
    */
    reconstructObj<T> (entry : DBRowResult) : T {
        throw new Error("Not implemented yet")
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
    let delete_row_template = 'DELETE FROM ?? WHERE ??;';

    let escaped_command = sqlstring.format(delete_row_template, [result_table_name, ("discreet_orm_id = " + reference_id)]);
    discreet_sql_io.updateOrDeleteRow(escaped_command);
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

export function commandForAddRow(obj: any) : command{
    let add_row_template = "INSERT INTO ? VALUES (?";
    obj.discreet_orm_id = hash(obj);
    let obj_hash = obj.discreet_orm_id;
    let vals_list = [obj.constructor.name,  obj_hash];
    let forbidden_attributes = ["discreet_orm_id"];
    let forbidden_attribute_types = ["function", "undefined", "object"];
    for (let attribute of Object.keys(obj)){
            // TODO: Object writing is a big feature so we need it in a separate feature
        if(!forbidden_attribute_types.includes(typeof(obj[attribute])) && !forbidden_attributes.includes(attribute)) {
            vals_list.push(obj[attribute]); 
            add_row_template += ", ?";
        }
    }
    add_row_template +=");";
    let escaped_command = sqlstring.format(add_row_template,vals_list);
    return escaped_command;
}

/**
 * addRow(obj, discreet_sql_io) adds the fields of obj to the DB. 
 * Precondition: The class of obj must already have an associated table. 
 * Does not add the hidden field 'discreet_orm_id' to the DB. 
 * @param obj is the database-backed objected whose information is added to the DB.
 * @param discreet_sql_io is the SQL interface.
 */
function addRow(obj: any, discreet_sql_io : DiscreetORMIO) : void {
    let sql_command = commandForAddRow(obj);
    discreet_sql_io.writeSQL(sql_command);            
    console.log(sql_command);
}

/** Queries the database to search for all objects of the 
 * specified class to reconstruct them into TypeScript objects. 
 */
function queryEntireClass<T> (class_name : string, discreet_sql_io : DiscreetORMIO) : Array<T> {
    let table = discreet_sql_io.readFromDB(class_name);
    let query_result = new Array<T>();

    table.forEach(function (object_entry) {
        let obj = discreet_sql_io.reconstructObj<T>(object_entry);
        query_result.push(obj);
    });

    return query_result;
}

/**
 * The StoredClass ObjectListener is applied to any class, through Listener, whose 
 * instantiated objects should be backed in the DB associated with the DiscreetORMIO 
 * passed into the constructor.
 */
export class StoredClass implements ObjectListener<any>{
    discreet_sql_io : DiscreetORMIO;

    constructor(sql_out : DiscreetORMIO) {
        this.discreet_sql_io = sql_out;
    }

    commandForNewTable(table_name: string, keys: string [], obj: any) : command {
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
        let escaped_command = <string> sqlstring.format(create_table_template, args);
        return escaped_command;
    }

    createNewTable(obj: any) : void {
        let table_name = obj.constructor.name;
        let keys = Object.keys(obj);
        let sql_command = this.commandForNewTable(table_name, keys, obj);
        console.log(sql_command);
        this.discreet_sql_io.writeSQL(sql_command);
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
let conn = mysql.createConnection({
    host     : 'localhost',
    user     : 'cds',
    password : 'fakepassword',
    database : 'testing'
});
conn.connect();

export const SQL_IO = new DatabaseORMIO(command_out, table_lst, conn);

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
