import 'mocha';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(sinonChai);
chai.use(chaiAsPromised);

import * as index from '../../dist/index.js'; // Updated path
import ConstructBuilder from '../../dist/construct-builder.js'; // Updated path
import ConstructFactory from '../../dist/construct-factory.js'; // Updated path

describe('index', () => {
    it('should implement methods required by the interface', function () {
        expect(index.ConstructBuilder).to.equal(ConstructBuilder);
        expect(index.ConstructFactory).to.equal(ConstructFactory);
    });
});
