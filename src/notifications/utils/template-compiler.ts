export class TemplateCompiler {
  static compile(template: string, payload: Record<string, unknown>): string {
    let result = template;

    for (const [key, value] of Object.entries(payload)) {
      const placeholder = `{{${key}}}`;

      let safeValue = '';

      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        safeValue = String(value);
      }

      // null, undefined, object, array => ''
      result = result.split(placeholder).join(safeValue);
    }

    return result;
  }
}
