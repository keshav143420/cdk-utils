import { argValidator } from '@vamship/arg-utils';
import { config as awsConfig, KMS, SharedIniFileCredentials } from 'aws-sdk';
import { Promise } from 'bluebird';

/**
 * Utility class that can be used to encrypt secret values using a kms key.
 */
export default class SecretManager {
    private _keyId: string;
    private _profile: string;

    /**
     * @param keyId The id of the key to use when generating encrypted values.
     * @param profile The name of the AWS profile to use when invoking the the
     *        KMS API.
     */
    constructor(keyId: string, profile = process.env.AWS_PROFILE) {
        argValidator.checkString(keyId, 1, 'Invalid keyId (arg #1)');
        argValidator.checkString(profile, 1, 'Invalid profile (arg #2)');

        this._keyId = keyId;
        this._profile = profile as string;
    }

    /**
     * Asynchronous helper method that uses the kms alias to create a secret
     * manager instance.
     *
     * @param The alias of the kms key to use for encryption.
     *
     * @returns A secret manager instance.
     */
    public static async create(
        alias: string,
        profile = process.env.AWS_PROFILE
    ): Promise<SecretManager> {
        argValidator.checkString(alias, 1, 'Invalid alias (arg #1)');
        argValidator.checkString(profile, 1, 'Invalid profile (arg #2)');

        alias = `alias/${alias}`;

        awsConfig.credentials = new SharedIniFileCredentials({ profile });
        const kms = new KMS();

        const listAliases = Promise.promisify(kms.listAliases.bind(kms));

        const result = await listAliases({});
        const keyInfo = result.Aliases.find(
            ({ AliasName: aliasName }) => aliasName === alias
        );

        if (!keyInfo) {
            throw new Error(`Could not find KMS key for alias: [${alias}]`);
        }

        const { TargetKeyId: keyId } = keyInfo;

        if (!keyId) {
            throw new Error(
                `Alias is not associated with a target key id: [${alias}]`
            );
        }

        return new SecretManager(keyId, profile);
    }

    /**
     * Encrypts a string and returns the encrypted value.
     *
     * @param plaintext The plaintext string to encrypt.
     *
     * @returns An encrypted string using the key associated with this class.
     */
    public async encrypt(plaintext: string): Promise<string> {
        argValidator.checkString(plaintext, 1, 'Invalid plaintext (arg #1)');

        awsConfig.credentials = new SharedIniFileCredentials({
            profile: this._profile,
        });
        const kms = new KMS();

        const encrypt = Promise.promisify(kms.encrypt.bind(kms));

        const result = await encrypt({
            KeyId: this._keyId,
            Plaintext: plaintext,
        });

        if (!result || !result.CiphertextBlob) {
            throw new Error('Error encrypting string using KMS');
        }
        return result.CiphertextBlob.toString('base64');
    }
}
