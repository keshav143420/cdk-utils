import ConstructFactory from '../construct-factory.js';
import DirInfo from '../dir-info.js';

export interface MyNewType {
    construct: ConstructFactory<any>;
    directory: DirInfo;
}
