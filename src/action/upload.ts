import * as core from '@actions/core'
import { Octokit } from "@octokit/action";
import { htmlFormatRawLogs } from '../util/html';
import { parseMultiInput } from '../util/parse';

export async function uploadLogs(api: Octokit): Promise<void> {
    if(!process.env.GITHUB_REPOSITORY) {
        throw new Error("GITHUB_REPOSITORY is not defined");
    }

    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

    if (!process.env.GITHUB_RUN_NUMBER) {
        throw new Error("GITHUB_RUN_NUMBER is not defined");
    }

    let runID = core.getInput("runID") === "auto" ? undefined : core.getInput("runID");

    if (!runID) {
        if (!process.env.GITHUB_RUN_ID) {
            throw new Error("GITHUB_RUN_ID is not defined");
        }
        runID = process.env.GITHUB_RUN_ID;
    }

    let attemptNumber = core.getInput("attemptNumber") === "auto" ? undefined : core.getInput("attemptNumber");

    if (!attemptNumber) {
        if (!process.env.GITHUB_RUN_ATTEMPT) {
            attemptNumber = "1";
        } else {
            attemptNumber = process.env.GITHUB_RUN_ATTEMPT;
        }
    }

    const workflowRunsResponse = await api.rest.actions.listJobsForWorkflowRunAttempt({
        owner,
        repo,
        run_id: parseInt(runID),
        attempt_number: parseInt(attemptNumber)
    });

    const excludedJobs = core.getInput("excludeJobs") === "" ? [] : parseMultiInput(core.getInput("excludeJobs"));

    // Completed jobs dorted by completed_at
    const completedJobs = workflowRunsResponse.data.jobs
        .filter(job => job.status === "completed")
        .filter(job => !excludedJobs.includes(job.name))
        .sort((a, b) => { return new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime() });


    const logs: { log: string, name: string }[] = [];
    for (const job of completedJobs) {
        const jobLogsResponse = await api.rest.actions.downloadJobLogsForWorkflowRun({
            owner,
            repo,
            job_id: job.id,
            run_id: parseInt(runID)
        });

        const log = jobLogsResponse.data as string;
        const name = job.name;

        logs.push({ log, name });
    }

    const formatAsHTML = core.getBooleanInput("formatAsHTML");

    if (formatAsHTML) {
        const html = htmlFormatRawLogs(logs);
        await uploadToRelease(api, 'release_log.html', html, owner, repo);
    } else {
        const text = logs.map(log => `## ${log.name}\n\n${log.log}`).join("\n\n");
        await uploadToRelease(api, 'release_log.log', text, owner, repo);
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