import {Connection} from "mysql";

const fs = require('fs');
import mysql = require('mysql');

const deasync = require('deasync');

export interface ObjectListener<T> {
    discreet_sql_io : DiscreetORMIO;
    onObjectCreation(t: T): void;
}

/**
 * An array that represents a row in the database representation.
 */
export type DBRowResult = Array<string>;

/**
 * DiscreetORMIO defines a location to write SQL commands to. 
 * A single instance of a DiscreetORMIO object is associated with 
 * a single database. 
 */
export interface DiscreetORMIO {
    readTables() : string [];
    insertRow(insertString : string ) : number
    writeNewTable(table_name : string) : void;
    readFromDB(command : string) : Array<DBRowResult>;
    reconstructObj<T> (entry : DBRowResult, class_name: string) : T;
    executeQuery(queryString : string ) : void;
}

/** 
 * [command] is the type for sql commands.
 */
export type command = string

export class DatabaseORMIO implements DiscreetORMIO {
    sql_filepath : string;
    tlist_filepath : string;
    mysql_conn : Connection;
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

    /**
     * Executes the passed update statement
     *
     * TODO: refactor update query building functionality into here?
     * @param queryString the escaped SQL update or delte query
     */
    executeQuery(queryString : string ) : void {
        console.log(queryString);

        let done = false;
        this.mysql_conn.query(queryString, function (error, results, fields) {
            if (error) throw error;
            done = true;
        });

        deasync.loopWhile(function() {return !done});

        this.mysql_conn.query(queryString);
    }

    /**
     * Executes a provided INSERT statement, and returns the auto increment primary key of the inserted record
     *
     * @param insertString
     */
    insertRow(insertString : string ) : number {
        console.log(insertString);

        let id = -1;
        let done = false;

        // deasync will hold this function until query returns
        this.mysql_conn.query(insertString, function (error, results, fields) {
            if (error) throw error;
            console.log("inserted ID is: " + results.insertId);
            id = results.insertId;
            done = true;
        });
        deasync.loopWhile(function() {return !done});

        return id;
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
     * readFromDB(command : string, discreet_sql_io) passes a string command into the database
     * and returns an array of type DBRowResult (which is an array of strings), populated with 
     * entries of objects as specified in the command string.
    */
    readFromDB(class_name : string) : Array<DBRowResult> {
        let escaped_command = mysql.format("SELECT * FROM ?", [class_name]);
        let output: Array<DBRowResult>;
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
    reconstructObj<T> (entry : DBRowResult, class_name: string) : T {
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
    let delete_row_template = 'DELETE FROM ?? WHERE orm_id = ?;';

    let escaped_command = mysql.format(delete_row_template, [result_table_name, reference_id]);
    discreet_sql_io.executeQuery(escaped_command);
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
            private discreet_orm_id = -1;
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
 * @param to_write
 * @param discreet_sql_io
 */
function writeToDB(to_write: any, discreet_sql_io : DiscreetORMIO) {
    let result_table_name = to_write.constructor.name;
    let reference_id = to_write.discreet_orm_id;

    if (to_write.discreet_orm_id == -1) {
        // first time insertion, update ID after insert
        let insert_qstr = commandForAddRow(to_write);
        to_write.discreet_orm_id = discreet_sql_io.insertRow(insert_qstr);
    } else {
        // need to update
        let insert_row_template = 'UPDATE ? ;';
        let update_qstr = commandForUpdateRow(to_write);
        discreet_sql_io.executeQuery(update_qstr);
    }
    console.log([result_table_name, ("orm_id = " + reference_id)]);
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
    let add_row_template = "INSERT INTO ?? (??) VALUES (?);";
    let attrs_list = [];
    let vals_list = [];
    let forbidden_attributes = ["discreet_orm_id"];
    let forbidden_attribute_types = ["function", "undefined", "object"];
    for (let attribute of Object.keys(obj)){
        // TODO: Object writing is a big feature so we need it in a separate function
        if(!forbidden_attribute_types.includes(typeof(obj[attribute])) && !forbidden_attributes.includes(attribute)) {
            attrs_list.push(attribute);
            vals_list.push(obj[attribute]);
        }
    }
    return mysql.format(add_row_template, [obj.constructor.name, attrs_list, vals_list]);
}

function commandForUpdateRow(obj: any) : command{
    let update_row_template = "UPDATE ?? SET ? WHERE orm_id = ?;";
    let attrs_dict = {};
    let forbidden_attributes = ["discreet_orm_id"];
    let forbidden_attribute_types = ["function", "undefined", "object"];

    // creates a dictionary/object copy of obj but without attributes explicitly excluded
    // TODO: we need to avoid code duplication for this type of iteration
    for (let attribute of Object.keys(obj)){
        if(!forbidden_attribute_types.includes(typeof(obj[attribute])) && !forbidden_attributes.includes(attribute)) {
            attrs_dict[attribute] = obj[attribute];
        }
    }
    return mysql.format(update_row_template, [obj.constructor.name, attrs_dict, obj.discreet_orm_id]);
}


/** Queries the database to search for all objects of the 
 * specified class to reconstruct them into TypeScript objects. 
 */
function queryEntireClass<T> (class_name : string, discreet_sql_io : DiscreetORMIO) : Array<T> {
    let table = discreet_sql_io.readFromDB(class_name);
    let query_result = new Array<T>();

    table.forEach(function (object_entry) {
        let obj = discreet_sql_io.reconstructObj<T>(object_entry, class_name);
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
                    args.push(keys[i]);
                    args.push(this.tsTypeToSQLType(obj[keys[i]].constructor.name));
                    count++;
                }
            }
        }
        // escape all the user-generated column name strings
        let qmark_arr = new Array<String>(count);
        qmark_arr.fill('?? ?');
        let qmark_str = qmark_arr.join(',');
        let create_table_template = `CREATE TABLE IF NOT EXISTS ?? (orm_id INT(255) PRIMARY KEY NOT NULL AUTO_INCREMENT, ${qmark_str});`;
        return <string>mysql.format(create_table_template, args);
    }

    createNewTable(obj: any) : void {
        let table_name = obj.constructor.name;
        let keys = Object.keys(obj);
        let sql_command = this.commandForNewTable(table_name, keys, obj);
        console.log(sql_command);
        this.discreet_sql_io.executeQuery(sql_command);
        this.discreet_sql_io.writeNewTable(table_name);
    }
    
    onObjectCreation(obj: any) {
        let table_name = obj.constructor.name;
        if (!this.discreet_sql_io.readTables().includes(table_name)){
            this.createNewTable(obj);
        }

        writeToDB(obj, this.discreet_sql_io);
    }

    tsTypeToSQLType(ts_type : String) : () => string{
        switch (ts_type) {
            case "String": {
                return mysql.raw("VARCHAR(255)");
            }
            case "Number" : {
                return mysql.raw("INT(255)");
            }
            case "number" : {
                return mysql.raw("INT(255)");
            }
            default : {
                return mysql.raw("VARCHAR(255)");
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
