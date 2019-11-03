import * as DiscreetORM from './../clientlib/src/DiscreetORM'
import { expect } from 'chai';
import 'mocha';
import { stringify } from 'querystring';
import { create } from 'domain';

function spaceIndependentEquals(s1 : string, s2: string) : boolean{
    if (s1.length != s2.length){
        return false; 
    }

    for (let i = 0; i < s1.length; i++){
        if (s1.charCodeAt(i) === 32 || s1.charCodeAt(i) === 160){
            if (s2.charCodeAt(i) === 32 || s2.charCodeAt(i) === 160){
                continue
            } else {
                false;
            }
        }
        if (s1.charCodeAt(i) != s2.charCodeAt(i)){
            console.log(s1.charCodeAt(i) + ' didnt match ' + s2.charCodeAt(i));
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

});
