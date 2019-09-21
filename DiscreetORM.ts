const fs = require('fs');

export interface ObjectListener<T> {
    onObjectCreation(t: T): void;
}

export class DiscreetORMOutput {
    sql_filepath : string;
    tlist_filepath : string;

    constructor(sql_path : string, tlist_path : string) {
        this.sql_filepath = sql_path;
        this.tlist_filepath = tlist_path;
    }

    writeSQL(output : string) : void {
        let formatted_output = '\n' + output;
        let buffer = Buffer.alloc(formatted_output.length, formatted_output);

        fs.appendFile(this.sql_filepath, buffer, (err) => {
            if (err) throw 'DiscreetORM SQL Table write error. Could not write to file: ' + err;;
            console.log('Wrote SQL Table to table list.');
          });
    }

    writeNewTable(table_name : string) : void {
        let formatted_output = '\n' + table_name;
        let buffer = Buffer.alloc(formatted_output.length, formatted_output);

        fs.appendFile(this.tlist_filepath, buffer, (err) => {
            if (err) throw 'DiscreetORM SQL Table write error. Could not write to file: ' + err;;
            console.log('Wrote SQL Table to table list.');
          });
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
            }
            func.prototype = constructorFunction.prototype;
            let result: any = new func();
            listener.onObjectCreation(result);
            return result;
        }
        newConstructorFunction.prototype = constructorFunction.prototype;
        return newConstructorFunction;
    }
}

export class StoredClass implements ObjectListener<any>{
    discreet_sql_out : DiscreetORMOutput;

    constructor(sql_out : DiscreetORMOutput) {
        this.discreet_sql_out = sql_out;
    }

    createNewTable(obj: any) : void {
        let table_name = obj.constructor.name;
        let command = "CREATE TABLE " + table_name + "( ";
        command += ' orm_id INT(255), '
		for (let attribute of Object.keys(obj)){
            let attribute_type = obj[attribute].constructor.name;
            command += attribute + " " +  this.tsTypeToSQLType(attribute_type) + ", ";
        }
        command += ")";
        console.log(command);
        this.discreet_sql_out.writeSQL(command);
        this.discreet_sql_out.writeNewTable(table_name);
    }

    onObjectCreation(obj: any) {
        this.createNewTable(obj);
    }

    tsTypeToSQLType(ts_type : String) : String{
        switch (ts_type) {
            case "String": {
                return "VARCHAR(255)";
            }
            case "Number" : {
                return "INT(255)"
            }
            default : {
                return "VARCHAR(255)"
            }
        }
    }
}

// Configuration Options: 
let command_out = 'commands.sql';
let table_lst = 'tables.tlst';

export const SQL_OUTPUT = new DiscreetORMOutput('commands.sql', table_lst);
// Applied on an example. 
@Listener(new StoredClass(SQL_OUTPUT))
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
