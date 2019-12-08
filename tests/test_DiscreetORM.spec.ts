import * as DiscreetORM from './../clientlib/src/DiscreetORM'
import { expect } from 'chai';
import 'mocha';
import { stringify } from 'querystring';
import { create } from 'domain';
import { test } from 'mocha';

type cart_result = [number,number]; 

function spaceIndependentEquals(s1 : string, s2: string) : boolean{
    if (s1.length != s2.length){
        return false; 
    }

    for (let i = 0; i < s1.length; i++){
        if (s1.charCodeAt(i) != s2.charCodeAt(i)){
            if (s1.charCodeAt(i) === 32 || s1.charCodeAt(i) === 160){
                if (!(s2.charCodeAt(i) === 32 || s2.charCodeAt(i) === 160)){
                    return false;
                } 
            } else {
                return false;
            }
        } 
    }
    return true;
}

/** parameterBasedEquals(o1, o2) comapres the parameters of the objects o1 and o2 for strict equality.
 *  o1 and o2 must have the same number of keys and same values for those keys. o1 and o2 must also have
 *  the same constructor name. 
 *  Yes, this is javascript nonsense.
*/
function parameterBasedEquals(o1: Object, o2: Object, debug_flag = false) : boolean{
    if (o1.constructor.name !== o2.constructor.name){
        return false;
    }

    let o1_keys = Object.keys(o1);
    if (o1_keys.length !== Object.keys(o2).length){
        if (debug_flag) console.log("Objects not the same length.");
        return false; 
    }
    for (let o1_key of o1_keys){
            try {
                if (typeof(o1[o1_key]) !== typeof(o2[o1_key])){
                    if (debug_flag) console.log(o1[o1_key] + ' has type ' + typeof(o1[o1_key]) + ' for o1.');
                    if (debug_flag) console.log(o2[o1_key] + ' has type ' + typeof(o2[o1_key]) + ' for o2.');
                    if (debug_flag) console.log(o1[o1_key] + ' does not have same type as ' + o2[o1_key]);
                    return false;
                }
                if (o1[o1_key] !== o2[o1_key]){
                    if (debug_flag) console.log(o1[o1_key] + ' has type ' + typeof(o1[o1_key]) + ' for o1.');
                    if (debug_flag) console.log(o2[o1_key] + ' has type ' + typeof(o2[o1_key]) + ' for o2.');
                    if (debug_flag) console.log(o1[o1_key] + ' is not equal to ' + o2[o1_key]);
                    return false; 
                }
            } catch (e) {
                if (debug_flag) console.log(e);
                return false;
            }
    }
    return true; 
}


describe('addRow test bench', () => {
    it('Basic commandForAddRow test', () => {
        class TestClass{
            a: string;
            b: number;
            constructor() {
                this.a = "hello";
                this.b = 34;
            }
        }
        let test_obj = new TestClass();
        let test_id = DiscreetORM.idOfObject(test_obj);
        let expected_command = <string>'INSERT\xa0INTO\xa0\'TestClass\'\xa0VALUES\xa0(\'' + test_id + '\',\xa0\'hello\',\xa034);'
        let test_obj_sql = <string>DiscreetORM.commandForAddRow(test_obj);
        expect(spaceIndependentEquals(expected_command, test_obj_sql)).to.be.true;
    });

    it ("addRow doesn't add functions", () => {
        class TestClass{
            a: string;
            b: number;
            constructor() {
                this.a = "hello";
                this.b = 34;
            }
            function  (s : string) {
                return s += " ";
            }
        }
        let test_obj = new TestClass();
        let test_id = DiscreetORM.idOfObject(test_obj);
        let expected_command = <string>'INSERT\xa0INTO\xa0\'TestClass\'\xa0VALUES\xa0(\'' + test_id + '\',\xa0\'hello\',\xa034);'
        let test_obj_sql = <string>DiscreetORM.commandForAddRow(test_obj);
        expect(spaceIndependentEquals(expected_command, test_obj_sql)).to.be.true;
    });

    it ("addRow doesn't add enumerable functions", () => {
        class TestClass{
            a: string;
            b: number;
            constructor() {
                this.a = "hello";
                this.b = 34;
            }

            f (s : string) {
                return s += " ";
            }
        }
        let test_obj = new TestClass();
        Object.defineProperty(test_obj, 'f', {
            enumerable: true
        });
        let test_id = DiscreetORM.idOfObject(test_obj);
        let expected_command = <string>'INSERT\xa0INTO\xa0\'TestClass\'\xa0VALUES\xa0(\'' + test_id + '\',\xa0\'hello\',\xa034);'
        let test_obj_sql = <string>DiscreetORM.commandForAddRow(test_obj);
        expect(spaceIndependentEquals(expected_command, test_obj_sql)).to.be.true;
    });

});

describe('Reconstruct test bench.', () => {
    it ("Reconstruct basic object with only string fields", () => {
        class TestClass{
            a: string;
            b: string;
            constructor() {
                this.a = "hello";
                this.b = "world";
            }
        }
        let test_obj = new TestClass();
        let entry_array = ['-1', test_obj.a, test_obj.b];
        let class_name = "TestClass";
        let column_names = ["discreet_orm_id", "a", "b"];
        let column_types = ["number", typeof(test_obj.a), typeof(test_obj.b)];
        let reconstructed_object = DiscreetORM.SQL_IO.reconstructObj<TestClass>(
            entry_array, 
            class_name, 
            column_names, 
            column_types);
        expect(parameterBasedEquals(test_obj, reconstructed_object)).to.be.true;
    });

    it ("Reconstruct basic object with mixed type fields", () => {
        class TestClass{
            a: string;
            b: number;
            constructor() {
                this.a = "hello";
                this.b = 34;
            }
        }
        let test_obj = new TestClass();
        let entry_array = ['-1', test_obj.a, test_obj.b.toString()];
        let class_name = "TestClass";
        let column_names = ["discreet_orm_id", "a", "b"];
        let column_types = ["number", typeof(test_obj.a), typeof(test_obj.b)];
        let reconstructed_object = DiscreetORM.SQL_IO.reconstructObj<TestClass>(
            entry_array, 
            class_name, 
            column_names, 
            column_types);
        expect(parameterBasedEquals(test_obj, reconstructed_object, true)).to.be.true;
    });

    it ("Reconstruct object with pretty complicated types.", () => {
        class TestClass{
            a: string;
            b: number;
            num_tup: cart_result;
            identity: (x: number) => number;
            
            constructor() {
                this.a = "hello";
                this.b = 34;
                this.num_tup = [4110,6110];
                this.identity = (x: number) => {return x;}
            }
        }
        let test_obj = new TestClass();
        let entry_array = ['-1', test_obj.a, test_obj.b.toString(), test_obj.num_tup.toString(), test_obj.identity.toString(), ];
        let class_name = "TestClass";
        let column_names = ["discreet_orm_id", "a", "b", "num_tup", "identity"];
        console.log("Type of num_tup is " + typeof(test_obj.num_tup) + " in test.");
        let column_types = ["number", typeof(test_obj.a), typeof(test_obj.b), typeof(test_obj.num_tup), typeof(test_obj.identity)];
        let reconstructed_object = DiscreetORM.SQL_IO.reconstructObj<TestClass>(
            entry_array, 
            class_name, 
            column_names, 
            column_types);
        expect(parameterBasedEquals(test_obj, reconstructed_object, true)).to.be.true;
    });
});
