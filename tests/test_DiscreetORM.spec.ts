import * as DiscreetORM from './../clientlib/src/DiscreetORM'
import { expect } from 'chai';
import 'mocha';

describe('empty test bench', () => {
    it('empty test', () => {
        const result = null;
        class TestIO implements DiscreetORMIO {
            
        }
        expect(result).to.equal(null);
    });

});
