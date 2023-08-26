import { writeFileSync } from 'fs';

interface Point {
    x: number;
    y: number;
}

class XmlElement {
    private readonly children: Array<XmlElement> = [];

    constructor(
        public readonly name: string,
        public readonly properties: Record<string, string> = {},
        public readonly isEmpty = false
    ) {}

    public add(el: XmlElement) {
        this.children.push(el);
    }

    public clone(): XmlElement {
        const clone = new XmlElement(this.name, { ...this.properties }, this.isEmpty);

        for (const child of this.children) {
            clone.add(child.clone());
        }

        return clone;
    }

    public write(lines: Array<string>, indent = ''): void {
        const tokens = Object.entries(this.properties).map(e => `${e[0]}="${e[1]}"`);
        tokens.unshift(this.name);

        if (this.isEmpty) {
            lines.push(`${indent}<${tokens.join(' ')} />`);
        } else if (this.children.length === 0) {
            lines.push(`${indent}<${tokens.join(' ')}></${this.name}>`);
        } else {
            lines.push(`${indent}<${tokens.join(' ')}>`);
            const childIndent = indent + '    ';
            this.children.forEach(child => child.write(lines, childIndent));
            lines.push(`${indent}</${this.name}>`);
        }
    }
}

class XmlEmptyElement extends XmlElement {
    constructor(name: string, properties?: Record<string, string>) {
        super(name, properties, true);
    }

    public add(el: XmlElement) {
        throw new Error(`can't add child to empty element "${this.name}"`);
    }
}

class Svg {
    public readonly root: XmlElement;

    constructor(public readonly width: number, public readonly height: number) {
        this.root = new XmlElement('svg', {
            width: width.toString(),
            height: height.toString(),

            xmlns: 'http://www.w3.org/2000/svg',
            'xmlns:xlink': 'http://www.w3.org/1999/xlink',
        });
    }

    add(el: XmlElement): void {
        this.root.add(el);
    }

    write(): Array<string> {
        const lines: Array<string> = [];
        lines.push('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
        lines.push(
            '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
        );
        this.root.write(lines);
        return lines;
    }
}

// values in mm and degrees

interface KeyboardSpecs {
    canvas: {
        height: number;
        width: number;
    };
    cap: {
        height: number;
        width: number;
    };
    // starting with outermost (pinky), absolute offsets
    columns: Array<{ offset: number }>;
    numRows: number;
    separation: number; // separation beteen halves
    spacing: {
        height: number;
        width: number;
    };
    strokeColor: string;
    strokeWidth: number;
    switch: {
        height: number;
        width: number;
    };
    thumb: {
        anchor: {
            offset: {
                horizontal: number;
                vertical: number;
            };
            rotation: number;
        };
        keys: Array<{
            angle?: number;
            size?: number; // sizes in units of keycap height, e.g. 1.5 u
            rotation?: number;
        }>;
        radius: number;
    };
    tilt: number; // tilt of each half
}

// | name        | pink | ring | middl | index | tilt | sep  | cap h | cap w | anc h | anc v |
// | ---------   | ---- | ---- | ----- | ----- | ---- | ---- | ----- | ----- | ----- | ----- |
// | Corne       | 4.75 | 2.37 | -2.37 | -2.37 |    - |    - |    19 |    19 |   7.5 |    20 |
// | Reviung34   |  3.5 |  3.5 |  -3.5 |  -3.5 |   10 |      | 19.05 | 19.05 |
// | Sweep       |   12 |    7 |  -5.5 |  -2.5 |    - |    - |    17 |    18 |   8.0 | 17.69 |
// | Fidrildi    |    5 |    3 |    -3 |    -2 |   12 | 30.6 |    19 |    19 |  7.27 | 20.89 |
// | Steeb1      |   12 |    7 |    -5 |    -3 |    - |    - |    17 |    18 |   8.0 |  17.7 |
// | Steeb2      |    6 |    3 |    -3 |    -3 |   12 |   50 |    17 |    18 |     9 |    18 |
// | Fidrildi2   |    7 |    3 |    -3 |    -3 |   15 |   60 |    19 |    19 |  7.27 |    22 |
// | Fidrildi3   |    7 |    3 |    -3 |    -4 |   20 |   40 |    19 |    19 |  7.27 |    22 |
// | Fidrildi4   |    7 |    3 |    -3 |    -3 |   20 |   40 |    19 |    19 |  7.27 |    23 |

const specs: KeyboardSpecs = {
    canvas: { height: 300, width: 500 },
    cap: { height: 19, width: 19 },
    columns: [
        { offset: 7 }, // pinky -> ring
        { offset: 3 }, // ring -> middle
        { offset: -3 }, // middle -> index
        { offset: -3 }, // index -> inner
    ],
    numRows: 3,
    separation: 42,
    spacing: { height: 19, width: 19 },
    strokeColor: 'black',
    strokeWidth: 0.2,
    switch: {
        height: 14.5,
        width: 14.5,
    },
    thumb: {
        anchor: {
            offset: {
                horizontal: 7.27,
                vertical: 23,
            },
            rotation: 15,
        },
        keys: [
            { size: 1, rotation: 15 },
            { size: 1.5, rotation: 15 },
        ],
        radius: 85,
    },
    tilt: 20,
};

class Steeb {
    private readonly debug = false;
    private readonly showSwitchTargets = true;

    public render(fileName: string): void {
        const svg = this.renderKeyboard(specs);

        const lines = svg.write();

        try {
            writeFileSync(fileName, lines.join('\n'));
        } catch (error) {
            console.log(`failed writing file: ${error}`);
        }
    }

    private renderKeyboard(specs: KeyboardSpecs): Svg {
        const dpi = 96; // affinity: 72, inkscape: 96
        const pxToMm = dpi / 25.4;
        const svg = new Svg(specs.canvas.width * pxToMm, specs.canvas.height * pxToMm);

        if (this.debug) {
            const width = specs.canvas.width;
            const height = specs.canvas.height;

            const border = new XmlElement('path', {
                d: `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`,
                fill: 'none',
                stroke: 'blue',
            });
            svg.add(border);

            const center = new XmlElement('circle', {
                cx: '0',
                cy: '0',
                r: '10',
                fill: 'none',
                stroke: 'blue',
            });
            svg.add(center);
        }

        const container = new XmlElement('g', {
            fill: 'none',
            stroke: `${specs.strokeColor}`,
            'stroke-width': `${specs.strokeWidth}`,
        });

        svg.add(container);

        const left = new XmlElement('g');
        container.add(left);

        if (this.debug) {
            const r = 5;
            const ref = new XmlElement('path', {
                d: `M ${-r} ${-r} L ${r} ${-r} L ${r} ${r} L ${-r} ${r} Z`,
                fill: 'none',
                stroke: 'blue',
            });
            left.add(ref);
        }

        const fingers = new XmlElement('g');
        left.add(fingers);

        const columnOffsets: Array<number> = Array<number>(specs.columns.length + 1).fill(0);

        for (let i = 0; i < specs.columns.length; i++) {
            const offset = specs.columns[i]?.offset ?? 0;

            for (let j = 0; j <= i; j++) {
                columnOffsets[j] += offset;
            }
        }

        let min = columnOffsets[0];
        columnOffsets.forEach(o => (min = o < min ? o : min));
        columnOffsets.forEach((o, i) => (columnOffsets[i] = o - min));

        const innerLower: Point = { x: 0, y: 0 };
        const innerUpper: Point = { x: 0, y: 0 };

        for (let c = 0; c < columnOffsets.length; c++) {
            for (let r = 0; r < specs.numRows; r++) {
                const x = (c + 0.5) * specs.spacing.width;
                const y = (r + 0.5) * specs.spacing.height + columnOffsets[c];

                if (c === columnOffsets.length - 1 && r === 0) {
                    innerUpper.x = x;
                    innerUpper.y = y;
                }

                if (c === columnOffsets.length - 1 && r === specs.numRows - 1) {
                    innerLower.x = x;
                    innerLower.y = y;
                }

                if (this.showSwitchTargets) {
                    const xx = 0.25 * specs.switch.width;
                    const yy = 0.25 * specs.switch.height;
                    const l = x - 0.5 * specs.switch.width;
                    const r = l + specs.switch.width;
                    const t = y - 0.5 * specs.switch.height;
                    const b = t + specs.switch.height;
                    let d = `M ${l} ${t + yy} L ${l} ${t} L ${l + xx} ${t}`;
                    d += ` M ${r - xx} ${t} L ${r} ${t} L ${r} ${t + yy}`;
                    d += ` M ${r} ${b - yy} L ${r} ${b} L ${r - xx} ${b}`;
                    d += ` M ${l + xx} ${b} L ${l} ${b} L ${l} ${b - yy}`;
                    fingers.add(new XmlEmptyElement('path', { d }));
                } else {
                    fingers.add(
                        new XmlEmptyElement('rect', {
                            x: `${x - 0.5 * specs.switch.width}`,
                            y: `${y - 0.5 * specs.switch.height}`,
                            width: `${specs.switch.width}`,
                            height: `${specs.switch.height}`,
                        })
                    );
                }

                fingers.add(
                    new XmlEmptyElement('rect', {
                        x: `${x - 0.5 * specs.cap.width}`,
                        y: `${y - 0.5 * specs.cap.height}`,
                        width: `${specs.cap.width}`,
                        height: `${specs.cap.height}`,
                    })
                );
            }
        }

        const tx =
            innerLower.x -
            specs.thumb.anchor.offset.horizontal -
            specs.thumb.radius * Math.sin(specs.thumb.anchor.rotation * (Math.PI / 180));
        const ty =
            innerLower.y +
            specs.thumb.anchor.offset.vertical +
            specs.thumb.radius * Math.cos(specs.thumb.anchor.rotation * (Math.PI / 180));
        const thumbs = new XmlElement('g', { transform: `translate(${tx}, ${ty})` });

        // thumb radius center
        //thumbs.add(
        //    new XmlEmptyElement('rect', { x: `0`, y: `0`, width: `2`, height: `2`, fill: `red` })
        //);

        let angle = 0;

        for (const key of specs.thumb.keys) {
            angle += key.rotation ?? 15;
            const rot = key.angle ?? angle;
            const u = key.size ?? 1;
            const thumbKeyGroup = new XmlElement('g', {
                transform: `rotate(${rot}) translate(0, ${-specs.thumb.radius})`,
            });
            thumbs.add(thumbKeyGroup);
            thumbKeyGroup.add(
                new XmlEmptyElement('rect', {
                    x: `${-0.5 * specs.cap.width}`,
                    y: `${(0.5 - u) * specs.cap.height}`,
                    width: `${specs.cap.width}`,
                    height: `${u * specs.cap.height}`,
                })
            );

            if (this.showSwitchTargets) {
                const xx = 0.25 * specs.switch.width;
                const yy = 0.25 * specs.switch.height;
                const l = -0.5 * specs.switch.width;
                const r = l + specs.switch.width;
                const t = -0.5 * specs.switch.height - 0.5 * (u - 1) * specs.cap.height;
                const b = t + specs.switch.height;
                let d = `M ${l} ${t + yy} L ${l} ${t} L ${l + xx} ${t}`;
                d += ` M ${r - xx} ${t} L ${r} ${t} L ${r} ${t + yy}`;
                d += ` M ${r} ${b - yy} L ${r} ${b} L ${r - xx} ${b}`;
                d += ` M ${l + xx} ${b} L ${l} ${b} L ${l} ${b - yy}`;
                thumbKeyGroup.add(new XmlEmptyElement('path', { d }));
            } else {
                thumbKeyGroup.add(
                    new XmlEmptyElement('rect', {
                        x: `${-0.5 * specs.switch.width}`,
                        y: `${-0.5 * specs.switch.height - 0.5 * (u - 1) * specs.cap.height}`,
                        width: `${specs.switch.width}`,
                        height: `${specs.switch.height}`,
                    })
                );
            }
        }

        left.add(thumbs);

        // adjust separation to compensate for tilt
        const separation =
            specs.separation -
            2 *
                columnOffsets.length *
                specs.cap.width *
                (1 - Math.cos((specs.tilt * Math.PI) / 180));
        const right = left.clone();
        container.add(right);
        const rx =
            innerUpper.x + specs.cap.width + separation + columnOffsets.length * specs.cap.width;
        right.properties.transform = `translate(${rx}, 0) scale(-1, 1) rotate(${specs.tilt})`;
        left.properties.transform = `rotate(${specs.tilt})`;

        // offset to move tilted part back into view
        const cx =
            ((columnOffsets[0] ?? 0) + specs.numRows * specs.cap.height) *
                Math.sin((specs.tilt * Math.PI) / 180) +
            3 * specs.cap.width;
        container.properties.transform = `translate(${cx}, 0) scale(${pxToMm}, ${pxToMm})`;

        return svg;
    }
}

const steeb = new Steeb();
steeb.render('steeb.svg');
