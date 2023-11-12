import * as core from '@actions/core'
import { Octokit } from "@octokit/action";
import { uploadLogs } from './src/action/upload';

async function run(): Promise<void> {
    try {
        const octokit = new Octokit();
        await uploadLogs(octokit);
        console.log(`Uploaded logs to release`);
    } catch (error: any) {
        core.setFailed(error.message)
    }
}

run();