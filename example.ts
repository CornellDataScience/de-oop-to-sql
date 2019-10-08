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

    static updateGPA(student : Student, new_grade : number) : Student {
        student.studentGpa = student.studentGpa + new_grade;
        return student;
    }

	incrementYear() : void {
        // This is javascript big brain time.
        this.studentYear = +this.studentYear + 1 + ''; 
    }
}


class StudentMethods {

    @DiscreetORM.WriteToDB(DiscreetORM.SQL_IO)
    static updateGPA(student : Student, new_grade : number) : Student {
        student.studentGpa = student.studentGpa + new_grade;
        return student;
    }
}
let ahad_student = new Student('Ahad', '2021', 0.0);
let haram_student = new Student('Haram', '2020', 5.0);
Student.updateGPA(ahad_student, 2.0);
Student.updateGPA(haram_student, 2.5);
console.log(ahad_student);
console.log(haram_student);
// @ts-ignore
console.log("Haram's hidden orm id: " + haram_student.discreet_orm_id);
ahad_student.incrementYear();
ahad_student = StudentMethods.updateGPA(ahad_student, 1.0);
DiscreetORM.deleteFromDatabase(ahad_student, DiscreetORM.SQL_IO);
console.log(ahad_student);
