"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMarkup = exports.containsSpan = void 0;
/** Checks if `largeSpan` can contain `smallSpan` */
function containsSpan(largeSpan, smallSpan) {
    return largeSpan.start < smallSpan.start && smallSpan.end < largeSpan.end;
}
exports.containsSpan = containsSpan;
/** Partition a list into two parts based on a boolean: `[true, false]` */
function partition(list, filter) {
    let result = [[], []];
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (filter(item)) {
            result[0].push(item);
        }
        else {
            result[1].push(item);
        }
    }
    return result;
}
/**
 * Generate a global regex from a record
 *
 * each name will become a named capture group
 * */
const generateRegex = (parts) => {
    // todo: named grouped regexep's can be slow
    return RegExp(Object.entries(parts)
        .map(([type, pattern]) => `(${pattern.source})`)
        .join("|"), "g");
};
const generateMapping = (parts) => [...Object.keys(parts)];
const TOKEN_PARTS = {
    bold: /\*\*/,
    italic: /\/\//,
    underline: /__/,
    strikethrough: /~~/,
    codeblock: /```/,
    code: /``/,
    custom_start: /\[\w+:/,
    custom_end: /]/,
    newline: /\n/,
};
// todo: manually do this
const TOKENS = generateRegex(TOKEN_PARTS);
const TYPES = generateMapping(TOKEN_PARTS);
const tokenType = (token) => TYPES[token.findIndex((g, i) => i != 0 && g != null) - 1];
/**
 * Parses a string into entities
 * @returns A root text entitiy, meant to make entity rendering easier
 */
function parseMarkup(text) {
    var _a, _b;
    let markers = [];
    let entities = [];
    let tokens = [...text.matchAll(TOKENS)];
    /** checks if a line is the beginning to or the end of a blockquote */
    function parseLine(indice) {
        const markerIndex = markers.findIndex((m) => m.type === "blockquote");
        // todo: this is nearly the same as the bold, italic, etc... family of parsing rules and can likely be simplified into a function
        //       for now though I'm keeping it like this for performance and the fear of micro-drying
        if (markerIndex >= 0) {
            const marker = markers[markerIndex];
            const innerSpan = { start: marker.span.end, end: indice.start };
            const outerSpan = { start: marker.span.start, end: indice.end };
            const [innerEntities, remainingEntities] = partition(entities, (e) => containsSpan(outerSpan, e.outerSpan));
            markers.splice(markerIndex);
            entities = remainingEntities;
            entities.push({
                type: "blockquote",
                innerSpan,
                outerSpan,
                entities: innerEntities,
                params: {},
            });
        }
        if (text.startsWith("> ", indice.end)) {
            markers.push({
                type: "blockquote",
                span: { start: indice.start, end: indice.end + 1 },
            });
        }
    }
    if (!tokens)
        throw new Error("Did not parse...");
    parseLine({ start: 0, end: 0 });
    for (let pos = 0; pos < tokens.length; pos++) {
        const token = tokens[pos];
        const type = tokenType(token);
        if (token.index == null) {
            throw new Error(`No index found for token: ${token}`);
        }
        const indice = {
            start: token.index,
            end: token.index + token[0].length,
        };
        switch (type) {
            // newline is first because it's the most common and should match first for performance
            case "newline":
                parseLine(indice);
                break;
            case "bold":
            case "italic":
            case "underline":
            case "strikethrough": {
                const markerIndex = markers.findIndex((m) => m.type === type);
                if (markerIndex >= 0) {
                    const marker = markers[markerIndex];
                    const innerSpan = { start: marker.span.end, end: indice.start };
                    const outerSpan = { start: marker.span.start, end: indice.end };
                    const [innerEntities, remainingEntities] = partition(entities, (e) => containsSpan(outerSpan, e.innerSpan));
                    markers.splice(markerIndex);
                    entities = remainingEntities;
                    entities.push({
                        type,
                        innerSpan,
                        outerSpan,
                        entities: innerEntities,
                        params: {},
                    });
                }
                else {
                    markers.push({
                        type: type,
                        span: indice,
                    });
                }
                break;
            }
            case "code": {
                // because code doesn't have innerEntities, we can skip parsing those tokens
                const markerIndex = tokens.findIndex((t, i) => i > pos && tokenType(t) === "code");
                if (markerIndex >= 0) {
                    const endToken = tokens[markerIndex];
                    const endIndice = {
                        start: endToken.index,
                        end: endToken.index + endToken[0].length,
                    };
                    entities.push({
                        type: "code",
                        innerSpan: { start: indice.end, end: endIndice.start },
                        outerSpan: { start: indice.start, end: endIndice.end },
                        entities: [],
                        params: {},
                    });
                    pos = markerIndex;
                }
                break;
            }
            case "codeblock": {
                // find the matching token
                const markerIndex = tokens.findIndex((t, i) => i > pos && tokenType(t) === "codeblock");
                if (markerIndex >= 0) {
                    const endToken = tokens[markerIndex];
                    const endIndice = {
                        start: endToken.index,
                        end: endToken.index + endToken[0].length,
                    };
                    // get lang param
                    const langRegex = /\w+\n/;
                    langRegex.lastIndex = indice.end;
                    const args = langRegex.exec(text);
                    // remove the \n
                    const lang = (_a = args === null || args === void 0 ? void 0 : args[0]) === null || _a === void 0 ? void 0 : _a.trim();
                    entities.push({
                        type: "codeblock",
                        // add the lang length to the innerSpan start to skip that when getting the text
                        innerSpan: {
                            start: endIndice.end + ((_b = lang === null || lang === void 0 ? void 0 : lang.length) !== null && _b !== void 0 ? _b : 0),
                            end: indice.start,
                        },
                        outerSpan: { start: endIndice.start, end: indice.end },
                        entities: [],
                        params: {
                            lang: lang,
                        },
                    });
                    pos = markerIndex;
                }
                break;
            }
            case "custom_start": {
                const markerIndex = tokens.findIndex((t, i) => i > pos && tokenType(t) === "custom_end");
                if (markerIndex >= 0) {
                    const endToken = tokens[markerIndex];
                    const endIndice = {
                        start: endToken.index,
                        end: endToken.index + endToken[0].length,
                    };
                    entities.push({
                        type: "custom",
                        innerSpan: { start: endIndice.end, end: indice.start },
                        outerSpan: { start: endIndice.start, end: indice.end },
                        entities: [],
                        params: { type: token[0].slice(1, -1) },
                    });
                    pos = markerIndex;
                }
                break;
            }
            default: {
                throw new Error(`unknown token type: ${type}`);
            }
        }
    }
    parseLine({ start: text.length, end: text.length });
    return ({
        type: "text",
        innerSpan: { start: 0, end: text.length },
        outerSpan: { start: 0, end: text.length },
        entities: entities,
        params: {},
    });
}
exports.parseMarkup = parseMarkup;
