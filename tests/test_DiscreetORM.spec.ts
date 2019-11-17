import * as DiscreetORM from './../clientlib/src/DiscreetORM'
import { expect } from 'chai';
import 'mocha';
import { stringify } from 'querystring';
import { create } from 'domain';


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
