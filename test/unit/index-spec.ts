import 'mocha';
import _chai, { expect } from 'chai';
import _sinonChai from 'sinon-chai';
import _chaiAsPromised from 'chai-as-promised';

_chai.use(_sinonChai);
_chai.use(_chaiAsPromised);

import {
    ConstructBuilder as IndexCB,
    ConstructFactory as IndexCF,
} from '../../src/index.js';
import ConstructBuilder from '../../src/construct-builder.js';
import ConstructFactory from '../../src/construct-factory.js';

describe('index', () => {
    it('should implement methods required by the interface', function () {
        expect(IndexCB).to.equal(ConstructBuilder);
        expect(IndexCF).to.equal(ConstructFactory);
    });
});
