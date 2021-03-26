// deno run -A ./examples/cli/bin.ts examples/example.nv examples/cli/example.out.html

import h from "https://cdn.skypack.dev/vhtml?dts";
import {
  addTextSpans,
  Entity,
  parseMarkup,
  Span,
  UnreachableCaseError,
} from "../../markup.ts";

interface Context {
  text: string;
}

const EMOJI_NAMES: Record<string, string> = {
  sparkles: "✨",
};

const EMOJI_NAMES_REV: Record<string, string> = {
  "✨": "sparkles",
};

const sliceText = (ctx: Context, span: Span) =>
  ctx.text.slice(span.start, span.end);

const transformEntities = (entities: Entity[], ctx: Context) =>
  entities.map((e) => transformEntity(e, ctx));

function transformEntity(entity: Entity, ctx: Context): string {
  switch (entity.type) {
    case "text": {
      if (entity.entities.length > 0) {
        return transformEntities(entity.entities, ctx).join("");
      } else {
        return sliceText(ctx, entity.innerSpan);
      }
    }
    case "emoji": {
      let emoji = sliceText(ctx, entity.innerSpan);
      let name = EMOJI_NAMES_REV[emoji];
      if (name) {
        return h("span", { class: `emoji-${name}` }, emoji);
      } else {
        return emoji;
      }
    }
    case "emoji_name": {
      let name = sliceText(ctx, entity.innerSpan);
      if (name in EMOJI_NAMES) {
        return h("span", { class: `emoji-${name}` }, EMOJI_NAMES[name]);
      } else {
        return sliceText(ctx, entity.outerSpan);
      }
    }
    case "bold":
    case "italic":
    case "underline":
    case "strikethrough":
      return h(entity.type[0], {}, transformEntities(entity.entities, ctx));
    case "code":
      return h("code", {}, transformEntities(entity.entities, ctx));
    case "codeblock":
      return h(
        "pre",
        {},
        h(
          "code",
          {},
          transformEntities(entity.entities, ctx),
        ),
      );
    case "blockquote":
      return h("blockquote", {}, transformEntities(entity.entities, ctx));
    case "custom": {
      return transformCustomEntity(entity, ctx);
    }
    case "link": {
      const url = sliceText(ctx, entity.innerSpan)
      return h("a", { href: url }, url)
    }
    default: {
      throw new UnreachableCaseError(entity);
    }
  }
}

type CustomEntity = Entity & { type: "custom" };

function transformCustomEntity(entity: CustomEntity, ctx: Context) {
  const expr = sliceText(ctx, entity.innerSpan);
  switch (entity.params.type) {
    case "link": {
      const match = expr.match(/(.+)->(.+)/);
      if (match) {
        const url = match[1].trim();
        const text = match[2].trim();
        return h("a", { href: url }, text);
      } else {
        const link = expr.trim();
        return h("a", { href: link }, link);
      }
    }
    case "ruby": {
      let output = [];
      for (const match of expr.matchAll(/(.+?)\((.*?)\)/g)) {
        const text = match[1].trim();
        const annotation = match[2].trim();

        output.push(
          text,
          h("rp", {}, "("),
          h("rt", {}, annotation),
          h("rp", {}, ")"),
        );
      }

      return h("ruby", {}, output);
    }
  }
  return sliceText(ctx, entity.outerSpan);
}

// actual cli app

const [filePath, outPath] = Deno.args;

if (!filePath) {
  throw new Error(`filePath must be specified`);
}

const file = await Deno.readTextFile(filePath);
const entity = addTextSpans(parseMarkup(file));
const html = `
<html>
  <head>
    <title>nertivia markup cli example</title>
  </head>
  <body style="white-space: pre-line">
    ${transformEntity(entity, { text: file })}
  </body>
</html>
`;

if (outPath) {
  Deno.writeTextFileSync(outPath, html);
} else {
  console.log(html);
}
