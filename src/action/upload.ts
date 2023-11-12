import * as core from '@actions/core'
import { Octokit } from "@octokit/action";
import { htmlFormatRawLog } from '../util/html';

export async function uploadLogs(api: Octokit): Promise<void> {
    if(!process.env.GITHUB_REPOSITORY) {
        throw new Error("GITHUB_REPOSITORY is not defined");
    }

    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

    if (!process.env.GITHUB_RUN_NUMBER) {
        throw new Error("GITHUB_RUN_NUMBER is not defined");
    }

    let runID = core.getInput("runID") === "none" ? undefined : core.getInput("runID");

    if (!runID) {
        if (!process.env.GITHUB_RUN_ID) {
            throw new Error("GITHUB_RUN_ID is not defined");
        }
        runID = process.env.GITHUB_RUN_ID;
    }

    let attemptNumber = core.getInput("attemptNumber") === "none" ? undefined : core.getInput("attemptNumber");

    if (!attemptNumber) {
        if (!process.env.GITHUB_RUN_NUMBER) {
            attemptNumber = "1";
        } else {
            attemptNumber = process.env.GITHUB_RUN_NUMBER;
        }
    }

    const workflowRunsResponse = await api.rest.actions.listJobsForWorkflowRunAttempt({
        owner,
        repo,
        run_id: parseInt(runID),
        attempt_number: parseInt(attemptNumber)
    });

    const completedJobs = workflowRunsResponse.data.jobs.filter(job => job.status === "completed");

    const formatAsHTML = core.getBooleanInput("formatAsHTML");

    for (const job of completedJobs) {
        const jobLogsResponse = await api.rest.actions.downloadJobLogsForWorkflowRun({
            owner,
            repo,
            job_id: job.id,
            run_id: parseInt(runID)
        });

        const location = jobLogsResponse.headers.location;

        if (!location) {
            throw new Error("Location header is not defined");
        }

        const jobLog = await (await fetch(location)).text();
        const jobName = job.name.replace(/ /g, "_").toLowerCase() + '_log';

        if (formatAsHTML) {
            const html = htmlFormatRawLog(jobLog);
            await uploadToRelease(api, `${jobName}.html`, html, owner, repo);
            console.log(`Uploaded ${jobName}.html to release`);
        } else {
            await uploadToRelease(api, `${jobName}.log`, jobLog, owner, repo);
            console.log(`Uploaded ${jobName}.log to release`);
        }
    }

}

async function uploadToRelease(api: Octokit, name: string, content: string, owner: string, repo: string): Promise<void> {
    const releaseID = core.getInput("releaseID", { required: true });

    // create utf-8 file stream from content string
    const data = Buffer.from(content, "utf-8");
    const size = data.byteLength;

    await api.rest.repos.uploadReleaseAsset({
        headers: {
            "content-length": size,
            'content-type': 'application/octet-stream',
        },
        owner,
        repo,
        release_id: parseInt(releaseID),
        name,
        data: data as any
    });
}