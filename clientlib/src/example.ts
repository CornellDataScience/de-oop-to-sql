import * as DiscreetORM from './DiscreetORM'
import "reflect-metadata";


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
// ahad_student.f(3);
// Student.updateGPA(ahad_student, 2.0);
// Student.updateGPA(haram_student, 2.5);
// console.log(ahad_student);
// console.log(haram_student);
// // @ts-ignore
// console.log("Haram's hidden orm id: " + haram_student.discreet_orm_id);
// ahad_student.incrementYear();
// ahad_student = Student.updateGPA(ahad_student, 1.5);
// console.log(ahad_student);
// DiscreetORM.deleteFromDatabase(ahad_student, DiscreetORM.SQL_IO);
// console.log(ahad_student);
function test(discreet_sql_io : DiscreetORMIO){ 
    return function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        //needs to get object.keys, and then define the metadata for them
        // so we can get metadata for the object
        Reflect.defineMetadata(metadataKey, metadataValue, target, propertyKey);
        
        descriptor.value = function(... args: any[]) {
            let result = original_function.apply(this, args);
            writeToDB(this, discreet_sql_io); // write the state of the mutated object
            return result;    
        };

        return descriptor;
    }
}
class C {
    @Reflect.metadata("metadataKey", "metadataValue")
    method() {
    }
  }
  let obj = new C();
  let metadataValue = Reflect.getMetadata("metadataKey", obj, "method");
  console.log(metadataValue)