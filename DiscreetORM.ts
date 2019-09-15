function Listener<I extends ObjectListener<any>>(listener: I) {

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

interface ObjectListener<T> {
    onObjectCreation(t: T): void;
}

class DiscreetORMClassListener implements ObjectListener<any>{
    onObjectCreation(obj: any) {
        let table_name = obj.constructor.name;
        let command = "CREATE TABLE " + table_name + "( ";
		for (let attribute of Object.keys(obj)){
            let attribute_type = obj[attribute].constructor.name;
            command += attribute + " " +  this.tsTypeToSQLType(attribute_type) + ",";
        }
        command += ")";
        console.log(command);
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

// Applied on an example. 
@Listener(new DiscreetORMClassListener())
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

let taskRunner = new TaskRunner("test");