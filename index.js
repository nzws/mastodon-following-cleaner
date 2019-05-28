const fs = require('fs');
const csvSync = require('csv-parse/lib/sync');
const { createObjectCsvWriter } = require('csv-writer');
const mastodon = require('mastodon');
const moment = require('moment');

const config = require('./config');
const csv = fs.readFileSync('./following_accounts.csv');
const following = csvSync(csv);
const M = new mastodon({
    access_token: config.token,
    api_url: `https://${config.domain}/api/v1/`,
});
const period = moment().subtract(config.unactive_period);
const csvWriter = createObjectCsvWriter({
    path: `${__dirname}/result.csv`,
    header: [
        { id: 'acct', name: 'Account address' },
        { id: 'boost', name: 'Show boosts' }
    ],
    encoding: 'utf8'
});

const result = {
    "success": [],
    "success_data": [],
    "removed": [],
    "failed": []
};

function run(num) {
    const acct = following[num][0];
    const domain = acct.split('@')[1];

    // これアカウントじゃねえ
    if (!domain) {
        next(num);
        return;
    }

    // configで指定した削除対象インスタンス
    if (config.unfollow_domains.indexOf(domain) !== -1) {
        console.log('[removed:domain]', acct);
        result.removed.push(`${acct}: unfollow_domainsで指定されたインスタンスのアカウント`);
        next(num);
        return;
    }

    acctToAccountId(acct)
        .then(id => getLastPost(id, acct))
        .then(() => {
            console.log('[OK]', acct);
            result.success.push(acct);
            result.success_data.push({
                acct,
                boost: following[num][1]
            });
            next(num);
        }).catch(() => {
            next(num);
        })
}

run(0);

function next(num) {
    const nextNum = num + 1;
    if (!following[nextNum]) {
        write();
        return;
    }
    run(nextNum);
}

function write() {
    console.log('====== RESULT ======');
    console.log('success:');
    console.log(result.success.join('\n'));
    console.log('removed:');
    console.log(result.removed.join('\n'));
    console.log('failed:');
    console.log(result.failed.join('\n'));

    csvWriter.writeRecords(result.success_data)
        .then(() => {
            console.log('Create result.csv!!!✨');
        });
}

function acctToAccountId(acct) {
    return new Promise((resolve, reject) => {
        M.get('search', {
            q: acct,
            resolve: true,
            limit: 5
        }).then(resp => {
            const data = resp.data;

            for(let account of data.accounts) {
                if (account.acct === account.username) account.acct += `@${config.domain}`;
                if (account.acct === acct) {
                    resolve(account.id);
                    return;
                }
            }

            console.log('[failed:unknown]', 'acctToAccountId', acct);
            result.failed.push(`${acct}: アカウントIDへの変換時に見つかりませんでした`);
            reject();
        }).catch(resp => {
            console.log('[failed:API]', 'acctToAccountId', acct, resp);
            setTimeout(() => {
                acctToAccountId(acct)
                    .then(id => resolve(id))
                    .catch(() => reject());
            }, 60 * 1000);
        });
    });
}

function getLastPost(accountId, acct) {
    return new Promise((resolve, reject) => {
        M.get(`accounts/${accountId}/statuses`, {
            limit: 1
        }).then(resp => {
            const data = resp.data;

            const post = data[0];
            if (!post) {
                console.log('[failed:unknown]', 'getLastPost', acct);
                result.failed.push(`${acct}: 投稿がみつかりません`);
                reject();
                return;
            }

            const date = moment(post.created_at);
            if (date.diff(period) > 0) {
                resolve();
                return;
            }

            console.log('[removed:period]', 'getLastPost', acct);
            result.removed.push(`${acct}: unactive_periodで指定した期間以上投稿していないアカウント`);
            reject();
        }).catch(resp => {
            console.log('[failed:API]', 'getLastPost', acct, resp);
            setTimeout(() => {
                getLastPost(accountId, acct)
                    .then(() => resolve())
                    .catch(() => reject());
            }, 60 * 1000);
        });
    });
}

