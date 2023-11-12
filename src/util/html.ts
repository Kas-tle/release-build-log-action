import Convert from 'ansi-to-html';

const convert = new Convert();

export function htmlFormatRawLogs(logs: { log: string, name: string }[]): string {
    let htmlContent = '';

    const color = '#d1d7dd';
    const bgColor = '#151516';
    const commandColor = '#0008ff';

    logs.forEach(({ log, name }) => {
        let logHtmlContent = '';
        const lines = log.split('\n');
        let inGroup = false;

        lines.forEach(line => {
            // Regular expressions for stricter parsing
            const groupStartRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z) ##\[group\](.*)/;
            const groupEndRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z ##\[endgroup\]/;
            const commandRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z) \[command\](.*)/;

            if (groupStartRegex.test(line)) {
                if (inGroup) {
                    logHtmlContent += '</div></div>';
                }
                const matches = line.match(groupStartRegex);
                const timestamp = matches![1];
                const title = matches![2];
                inGroup = true;
                logHtmlContent += `<div class="log-group"><div class="collapsible">${timestamp} ${title} <span class="indicator">&lt;...&gt;</span></div><div class="content">`;
            } else if (groupEndRegex.test(line)) {
                inGroup = false;
                logHtmlContent += '</div></div>';
            } else if (commandRegex.test(line)) {
                const matches = line.match(commandRegex);
                const timestamp = matches![1];
                const command = matches![2];
                const formattedLine = `${timestamp} <span style="color: ${commandColor};">${toHTML(command)}</span><br>`;
                logHtmlContent += formattedLine;
            } else {
                const formattedLine = toHTML(line);
                logHtmlContent += inGroup ? formattedLine + '<br>' : `<div>${formattedLine}</div>`;
            }
        });

        if (inGroup) {
            logHtmlContent += '</div></div>';
        }

        htmlContent += `
            <div class="log-section">
                <div class="log-header collapsible">${name} <span class="indicator">&lt;...&gt;</span></div>
                <div class="log-body" style="display: block;">${logHtmlContent}</div>
            </div>
        `;
    });

    return `
    <div style="background-color: ${bgColor}; color: ${color}; font-family: monospace; overflow-wrap: break-word;">
        <button id="toggle-all">&lt;...&gt;</button>
        ${htmlContent}
    </div>
    <script>
        document.querySelectorAll('.log-header').forEach(header => {
            header.addEventListener('click', function() {
                this.classList.toggle('active');
                var body = this.nextElementSibling;
                body.style.display = body.style.display === 'block' ? 'none' : 'block';
            });
        });

        document.getElementById('toggle-all').addEventListener('click', function() {
            let anyGroupClosed = Array.from(document.querySelectorAll('.content')).some(content => content.style.display === 'none');
            document.querySelectorAll('.content').forEach(content => {
                content.style.display = anyGroupClosed ? 'block' : 'none';
                content.previousElementSibling.classList[anyGroupClosed ? 'add' : 'remove']('active');
            });
        });

        document.querySelectorAll('.collapsible:not(.log-header)').forEach(div => {
            div.addEventListener('click', function() {
                this.classList.toggle('active');
                var content = this.nextElementSibling;
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
            });
        });
    </script>
    <style>
        #toggle-all {
            font-family: monospace;
            margin-bottom: 10px;
        }

        .collapsible {
            font-family: inherit;
            font-weight: bold;
            background-color: transparent;
            color: inherit;
            cursor: pointer;
            padding: 0px;
            border: none;
            text-align: left;
            outline: none;
            display: block; /* Ensures the div behaves like a block element */
        }

        .collapsible:hover .indicator {
            text-decoration: underline;
        }

        .indicator {
            font-size: smaller;
        }

        .content, .log-body {
            padding: 0 18px;
            display: none;
            overflow: hidden;
        }

        div {
            overflow-wrap: break-word;
        }
    </style>`;
}

function toHTML(str: string): string {
    return convert.toHtml(str).replace(/ {2,}/g, match => '&nbsp;'.repeat(match.length));
}