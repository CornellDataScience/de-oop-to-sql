import * as DiscreetORM from './DiscreetORM'

@DiscreetORM.Listener(new DiscreetORM.StoredClass(DiscreetORM.SQL_OUTPUT))
class Student {
    studentName: string;
	studentYear : string; 
    studentGpa : Number;
    constructor(studentName: string, studentYear : string, studentGpa : number) {
        this.studentName = studentName;
        this.studentYear = studentYear;
        this.studentGpa = studentGpa;
    }

	f(number: Number) {
		return number; 
	}
}

let student = new Student('Ahad', '2021', 0);