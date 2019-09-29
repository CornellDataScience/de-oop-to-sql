const fs = require('fs');
const sqlstring = require ("sqlstring");
const hash = require('object-hash');

export interface ObjectListener<T> {
    onObjectCreation(t: T): void;
}

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
        let buffer = Buffer.alloc(formatted_output.length, formatted_output);
        
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
        let newConstructorFunction: any = function (...args) {
            let func: any = function () {
                return new constructorFunction(...args);
            };
            func.prototype = constructorFunction.prototype;
            let result: any = new func();
            listener.onObjectCreation(result);
            return result;
        };
        newConstructorFunction.prototype = constructorFunction.prototype;
        return newConstructorFunction;
    }
}

export class StoredClass implements ObjectListener<any>{
    discreet_sql_io : DiscreetORMIO;

    constructor(sql_out : DiscreetORMIO) {
        this.discreet_sql_io = sql_out;
    }

    createNewTable(obj: any) : void {
        let table_name = obj.constructor.name;
        let keys = Object.keys(obj);
        let create_table_template = 'CREATE TABLE ?? (orm_id INT(255), ??);';

        // create an array of column name-type strings
        let cols = new Array<string>(keys.length);
        for (let i = 0; i < keys.length; i++) {
            let sql_type = this.tsTypeToSQLType(obj[keys[i]].constructor.name);
            cols[i] = `${keys[i]} ${sql_type}`;
        }

        // escape all the user-generated column name strings
        let escaped_command = sqlstring.format(create_table_template, [table_name, cols]);
        console.log(escaped_command);
        this.discreet_sql_io.writeSQL(escaped_command);
        this.discreet_sql_io.writeNewTable(table_name);
        
       
    }
    
    addRow(obj: any) : void{
        let add_row_template = "INSERT INTO ? VALUES (?";
        let vals_list = [obj.constructor.name,hash(obj)];
        for (let attribute of Object.values(obj)){
            vals_list.push(attribute); 
            add_row_template += ", ?";
        }
        add_row_template +=")"
        let escaped_command = sqlstring.format(add_row_template,vals_list);
        this.discreet_sql_io.writeSQL(escaped_command);
        
        console.log(escaped_command);
    
    }
    onObjectCreation(obj: any) {
        let table_name = obj.constructor.name;
        if (!this.discreet_sql_io.readTables().includes(table_name)){
            this.createNewTable(obj);
        }
        this.addRow(obj);
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
