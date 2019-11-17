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
        let expected_command = <string>'INSERT INTO `TestClass` (`a`, `b`) VALUES (\'hello\', 34);';
        let test_obj_sql = <string>DiscreetORM.commandForAddRow(test_obj);
        expect(expected_command).to.equal(test_obj_sql);
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
        let expected_command = <string>'INSERT INTO `TestClass` (`a`, `b`) VALUES (\'hello\', 34);';
        let test_obj_sql = <string>DiscreetORM.commandForAddRow(test_obj);
        expect(expected_command).to.equal(test_obj_sql);
    });

});
