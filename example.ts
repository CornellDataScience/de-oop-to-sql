import * as DiscreetORM from './DiscreetORM'

@DiscreetORM.Listener(new DiscreetORM.StoredClass(DiscreetORM.SQL_IO))
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

let ahad_student = new Student('Ahad', '2021', 0);
let haram_student = new Student('Haram', '2020', 5.0);