import { readFileSync } from 'fs';
import { v4 as uuid } from 'uuid';
import { Element, xml2js } from 'xml-js';

interface ZoneDef {
    layer: string;
    net: number;
    netName: string;
    priority?: number;
    zoneNames: Array<string>;
}

const layoutStr = readFileSync('/Users/sjoiner/Dropbox/keyboard/fidrildi3/drawings/layout.svg');
const layout = xml2js(layoutStr.toString(), { compact: false });
const zoneDefs: Array<ZoneDef> = [
    //{
    //    layer: 'F.Cu',
    //    net: 41,
    //    netName: 'GND',
    //    priority: 1,
    //    zoneNames: ['fgnd'],
    //},
    {
        layer: 'B.Cu',
        net: 39,
        netName: '+5V',
        priority: 2,
        zoneNames: ['b5v-out', 'b5v-in'],
    },
];
const zoneNames = zoneDefs.flatMap(def => def.zoneNames);
const zones: Record<string, Array<[number, number]>> = {};
let allFound = false;

function computeAllFound(): void {
    const foundZones = Object.keys(zones);

    for (const name of zoneNames) {
        if (!foundZones.includes(name)) {
            allFound = false;
            return;
        }
    }

    allFound = true;
    return;
}

function findZones(el: Element): void {
    if (el.type === 'element' && el.name === 'path') {
        const zoneName = el.attributes?.['inkscape:label']?.toString() ?? '';

        if (zoneNames.includes(zoneName)) {
            const d = (el.attributes?.d?.toString() ?? '').split(/\s+|\s*,\s*/);

            const zone: Array<[number, number]> = [];
            let xStr = '0';
            let yStr = '0';
            let x = 0;
            let y = 0;
            let i = 0;

            while (i < d.length) {
                //console.debug(`i = ${i}`);
                let cmd = d[i++];

                if (cmd === 'M') {
                    //console.debug(cmd);
                    if (i !== 1) {
                        console.error(`unexpected command ${cmd} in ${zoneName}`);
                        process.exit(-1);
                    }

                    xStr = d[i++];
                    //console.debug(xStr);
                    x = parseFloat(xStr);
                    yStr = d[i++];
                    //console.debug(yStr);
                    y = parseFloat(yStr);
                } else if (cmd === 'L') {
                    //console.debug(cmd);
                    xStr = d[i++];
                    //console.debug(xStr);
                    x = parseFloat(xStr);
                    yStr = d[i++];
                    //console.debug(yStr);
                    y = parseFloat(yStr);
                } else if (cmd === 'H') {
                    //console.debug(cmd);
                    xStr = d[i++];
                    //console.debug(xStr);
                    x = parseFloat(xStr);
                } else if (cmd === 'V') {
                    //console.debug(cmd);
                    yStr = d[i++];
                    //console.debug(yStr);
                    y = parseFloat(yStr);
                } else {
                    xStr = cmd;
                    cmd = '(L)';
                    //console.debug(cmd);
                    //console.debug(xStr);
                    x = parseFloat(xStr);
                    yStr = d[i++];
                    //console.debug(yStr);
                    y = parseFloat(yStr);
                }

                if (Number.isNaN(x)) {
                    console.error(`unexpected value ${xStr} in ${zoneName}`);
                    process.exit(-1);
                }

                if (Number.isNaN(y)) {
                    console.error(`unexpected value ${yStr} in ${zoneName}`);
                    process.exit(-1);
                }

                //console.debug(`${cmd} ${x} ${y}`);
                zone.push([x, y]);
            }

            zones[zoneName] = zone;
            computeAllFound();
            return;
        }
    }

    for (const child of el.elements ?? []) {
        findZones(child);
        if (allFound) return;
    }
}

findZones(layout as Element);

for (const def of zoneDefs) {
    console.log(
        `  (zone (net ${def.net}) (net_name "${def.netName}") (layer "${
            def.layer
        }") (tstamp ${uuid()}) (hatch edge 0.5)`
    );

    if (def.priority !== undefined) {
        console.log(`    (priority ${def.priority})`);
    }

    console.log(`    (connect_pads (clearance 0.5))`);
    console.log(`    (min_thickness 0.25) (filled_areas_thickness no)`);
    console.log(`    (fill (thermal_gap 0.5) (thermal_bridge_width 0.5))`);

    for (const zoneName of def.zoneNames) {
        const zone = zones[zoneName] ?? [];

        console.log(`    (polygon`);
        console.log(`      (pts`);

        for (const [x, y] of zone) {
            console.log(`        (xy ${x} ${y})`);
        }

        console.log(`      )`);
        console.log(`    )`);
    }

    console.log(`  )`);
}
