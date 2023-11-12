export function parseMultiInput(input: string): string[] {
    let result: string[];

    if (input.includes('\n')) {
        result = input.split('\n');
    } else {
        result = input.split(',');
    }

    return result.map(s => s.trim()).filter(s => s !== '');
}