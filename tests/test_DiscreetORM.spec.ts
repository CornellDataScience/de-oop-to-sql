import * as DiscreetORM from './../clientlib/src/DiscreetORM'
import { expect } from 'chai';
import 'mocha';
import {DatabaseORMIO, DiscreetORMIO} from "./../clientlib/src/DiscreetORM";
import {Connection} from "mysql";
let testdouble = require('testdouble');
let chai = require('chai');
// let tdChai = require("testdouble-chai");
// chai.use(tdChai(testdouble));

// let mysql;
// module.exports = {
//     beforeEach: () => {
//         mysql = testdouble.replace('../node_modules/@types/mysql');
//     },
//     afterEach: function () { testdouble.reset() }
// };


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

describe('SQL_IO test bench', () => {
    let original_sql_io_connected:boolean;
    let original_sql_io_mysql_conn:Connection;

    // restore attributes of SQL_IO
    let cleanup = function() {
        DiscreetORM.SQL_IO.connected = original_sql_io_connected;
        DiscreetORM.SQL_IO.mysql_conn = original_sql_io_mysql_conn;
    };

    // store attributes that we modify
    beforeEach(function() {
        original_sql_io_connected = DiscreetORM.SQL_IO.connected;
        original_sql_io_mysql_conn = DiscreetORM.SQL_IO.mysql_conn;
    });

    // restore after each test
    afterEach(cleanup);

    // executeQuery tests
    it ("executeQuery calls query on DB", () => {
        // setup
        testdouble.replace(DiscreetORM.SQL_IO, 'mysql_conn');
        DiscreetORM.SQL_IO.connected = true;
        testdouble.when(DiscreetORM.SQL_IO.mysql_conn.query("TEST QUERY STRING")).thenCallback(null);

        // invocation
        DiscreetORM.SQL_IO.executeQuery("TEST QUERY STRING");

        // verify side effect
        testdouble.verify(DiscreetORM.SQL_IO.mysql_conn.query("TEST QUERY STRING", testdouble.matchers.anything()));
    });
    it ("executeQuery connects to DB if not connected", () => {
        // setup
        testdouble.replace(DiscreetORM.SQL_IO, 'mysql_conn');
        DiscreetORM.SQL_IO.connected = false;
        testdouble.when(DiscreetORM.SQL_IO.mysql_conn.query("TEST QUERY STRING")).thenCallback(null);
        testdouble.when(DiscreetORM.SQL_IO.mysql_conn.connect()).thenCallback(null);

        // invocation
        DiscreetORM.SQL_IO.executeQuery("TEST QUERY STRING");

        // verify side effect
        testdouble.verify(DiscreetORM.SQL_IO.mysql_conn.connect(testdouble.matchers.anything()));
    });

    // insertRow tests
    it ("insertRow gets returned ID", () => {
        // setup
        testdouble.replace(DiscreetORM.SQL_IO, 'mysql_conn');
        DiscreetORM.SQL_IO.connected = true;
        testdouble.when(DiscreetORM.SQL_IO.mysql_conn.query("TEST INSERT STRING")).thenCallback(null, {insertId: 999});

        // test - getting specified value implies that query was called and awaited correctly
        expect(DiscreetORM.SQL_IO.insertRow("TEST INSERT STRING")).to.equal(999);
    });
    it ("insertRow connects to DB if not connected", () => {
        // setup
        testdouble.replace(DiscreetORM.SQL_IO, 'mysql_conn');
        DiscreetORM.SQL_IO.connected = false;
        testdouble.when(DiscreetORM.SQL_IO.mysql_conn.query("TEST INSERT STRING")).thenCallback(null, {insertId: 999});
        testdouble.when(DiscreetORM.SQL_IO.mysql_conn.connect()).thenCallback(null);

        // invocation
        DiscreetORM.SQL_IO.insertRow("TEST INSERT STRING");

        // verify side effect
        testdouble.verify(DiscreetORM.SQL_IO.mysql_conn.connect(testdouble.matchers.anything()));
    });
});

describe('insertRow test bench', () => {

});

describe('writeNewTable test bench', () => {

});

describe('readFromDB test bench', () => {

});
