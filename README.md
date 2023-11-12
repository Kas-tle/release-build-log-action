# release-build-log-action
An action to append build logs to a given release

## Usage

This action takes a release ID and uploads the build log to the release as an asset. The release ID will typically be an output from another job. For example, see [Kas-tle/release-action](https://github.com/Kas-tle/release-action).

### Minimal Configuration

```yaml
jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    outputs:
      release_id: ${{ steps.release.outputs.releaseID }}
    steps:
      # ... Build steps
    - name: Create Release
      id: release
      # ... Some action that creates a release
  upload-logs:
    name: Upload Logs
    runs-on: ubuntu-latest
    permissions:
      # Give the default GITHUB_TOKEN upload to releases
      contents: write
    needs: release # Job with an output of release_id
    steps:
    - uses: Kas-tle/release-build-log-action@1.0.0
      with:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        releaseID: ${{ needs.build.outputs.release_id }}
```

### Inputs

| Input           | Description                                                                  | Default | Required |
| --------------- | ---------------------------------------------------------------------------- | ------- | -------- |
| `GITHUB_TOKEN`  | The GitHub token to use for the release.                                     |         | `true`   |
| `releaseID`     | The ID of the release to upload the logs.                                    |         | `true`   |
| `attemptNumber` | The Run attempt to get the logs from. Defaults to the current attempt.       | `auto`  | `false`  |
| `excludedJobs`  | Comma-separated or newline-separated list of jobs from which to ignore logs. | ``      | `false`  |
| `formatAsHTML`  | Whether or not we should make an HTML file for the logs. Defaults to true.   | `true`  | `false`  |
| `runID`         | The Run ID to get the logs from. Defaults to the current run.                | `auto`  | `false`  |