import * as DiscreetORM from './DiscreetORM'

@DiscreetORM.Listener(new DiscreetORM.StoredClass(DiscreetORM.SQL_IO))
class Student {
    studentName: string;
	studentYear : string; 
    studentGpa : number;
    constructor(studentName: string, studentYear : string, studentGpa : number) {
        this.studentName = studentName;
        this.studentYear = studentYear;
        this.studentGpa = studentGpa;
    }

	f(number: Number) {
		return number; 
    }
    
    static updateGPA(student : Student, new_grade : number) : Student {
        student.studentGpa = student.studentGpa + new_grade;
        return student;
    }
}

let ahad_student = new Student('Ahad', '2021', 0);
let haram_student = new Student('Haram', '2020', 5.0);
ahad_student.f(3);