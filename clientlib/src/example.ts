import * as DiscreetORM from './DiscreetORM'

@DiscreetORM.Listener(new DiscreetORM.StoredClass(DiscreetORM.SQL_IO))
class Student {
    studentName: string;
	studentYear : string; 
    studentGpa : number;
    // anon = (a, b) => a + b;
    constructor(studentName: string, studentYear : string, studentGpa : number) {
        this.studentName = studentName;
        this.studentYear = studentYear;
        this.studentGpa = studentGpa;
    }

    @DiscreetORM.InstanceListener(DiscreetORM.SQL_IO)
	f(number: Number) {
		return number;
    }

	incrementYear() : void {
        // This is javascript big brain time.
        this.studentYear = +this.studentYear + 1 + ''; 
    }

    @DiscreetORM.WriteReturnToDB(DiscreetORM.SQL_IO)
    static updateGPA(student : Student, new_grade : number) : Student {
        student.studentGpa = student.studentGpa + new_grade;
        return student;
    }
}

let ahad_student = new Student('Ahad', '2021', 0.0);
let haram_student = new Student('Haram', '2020', 5.0);
Object.defineProperty(ahad_student, 'enumerableAttributeNotToBeAdded', {
    value: (a, b) => a + b ,
    writable: false,
    enumerable: true
  });
  Object.defineProperty(ahad_student, 'nonEnumerableAttributeNotToBeAdded', {
    value: (a, b) => a - b ,
    writable: false,
    enumerable: false
  });
ahad_student.f(3);
Student.updateGPA(ahad_student, 2.0);
Student.updateGPA(haram_student, 2.5);
console.log(ahad_student);
console.log(haram_student);
// @ts-ignore
console.log("Haram's hidden orm id: " + haram_student.discreet_orm_id);
ahad_student.incrementYear();
ahad_student = Student.updateGPA(ahad_student, 1.5);
console.log(ahad_student);
DiscreetORM.deleteFromDatabase(ahad_student, DiscreetORM.SQL_IO);
console.log(ahad_student);
<<<<<<< HEAD
<<<<<<< HEAD
=======

>>>>>>> ca40e6e69971129f9e8b86d1547030be66f7dfd6

let test_obj = Object.create({a: 0, b: "hello"});
let test_obj_sql = DiscreetORM.commandForAddRow(test_obj);
console.log(test_obj_sql)
<<<<<<< HEAD
=======
=======

>>>>>>> ca40e6e69971129f9e8b86d1547030be66f7dfd6
console.log("DONE!");

// TODO: we need a better way of handling this
DiscreetORM.SQL_IO.close();
<<<<<<< HEAD
>>>>>>> origin/master
=======
>>>>>>> ca40e6e69971129f9e8b86d1547030be66f7dfd6
