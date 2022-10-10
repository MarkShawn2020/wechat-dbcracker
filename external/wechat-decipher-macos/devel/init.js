const labels = [
    '!!! LABEL_ERROR !!!',
    'optional',
    'required',
    'repeated'
]
const types = [
    '!!! TYPE_ERROR !!!',
    'double',
    'float',
    'int64',
    'uint64',
    'int32',
    'fixed64',
    'fixed32',
    'bool',
    'string',
    'TYPE_GROUP',
    'TYPE_MESSAGE',
    'bytes',
    'uint32',
    'TYPE_ENUM',
    'sfixed32',
    'sfixed64',
    'sint32',
    'sint64',
]


/*
 * Based on the blog post "iOS微信安装包瘦身" by We Mobile Dev
 * https://cloud.tencent.com/developer/article/1030792
 */
function show_fields_recursive(inst, name, indent, log) {
    const header = `[ENTRY] ${name} (${inst.$className})`;
    log();
    log(`${' '.repeat(indent * 4)}${header}`);
    log(`${' '.repeat(indent * 4)}${'='.repeat(header.length)}`);

    var items = [];

    Object.keys(inst.$ivars).forEach(function(k) {
        const v = inst.$ivars[k];
        log(`${' '.repeat(indent * 4)}$ivars['${k}'] = ${v}`);
        if (v &&
            k !== 'isa' &&
            v.$superClass !== undefined &&
            v.$superClass.$className === 'PBGeneratedMessage') {
            items.push([v, `${name}.${k}`]);
        }
    });

    const classInfo = inst.$ivars['_classInfo']; // PBClassInfo

    if (!classInfo.isNull()) {
        const numberOfProperty = classInfo.readUInt();

        log(`${' '.repeat(indent * 4)}${'-'.repeat(header.length)}`);
        const propertyNamesBase = classInfo.add(8).readPointer();
        const fieldInfosBase = classInfo.add(32).readPointer();
        for (let i = 0; i < numberOfProperty; i++) {
            const propertyName = propertyNamesBase
                .add(8 * i)
                .readPointer()
                .readUtf8String();
            const fieldType = fieldInfosBase
                .add(24 * i + 2)
                .readU8();
            const val = inst[propertyName]();
            log(`${' '.repeat(indent * 4)}${propertyName} = ${val}`);
            if (fieldType === 11) {
                if (val) {
                    const property = new ObjC.Object(val);
                    if (property.$className === '__NSArrayM') {
                        for (let i = 0; i < property.count(); i++) {
                            items.push([property.objectAtIndex_(i), `${name}.${propertyName}[${i}]`]);
                        }
                    } else {
                        items.push([property, `${name}.${propertyName}`]);
                    }
                }
            }
        }

        log(`${' '.repeat(indent * 4)}${'-'.repeat(header.length)}`);
        for (let i = 0; i < numberOfProperty; i++) {
            const propertyName = propertyNamesBase
                .add(8 * i)
                .readPointer()
                .readUtf8String();
            const fieldNumber = fieldInfosBase
                .add(24 * i)
                .readU8();
            const fieldLabel = fieldInfosBase
                .add(24 * i + 1)
                .readU8();
            const fieldType = fieldInfosBase
                .add(24 * i + 2)
                .readU8();
            const isPacked = fieldInfosBase
                .add(24 * i + 3)
                .readU8();
            log(`${' '.repeat(indent * 4)}${labels[fieldLabel]} ${types[fieldType]} ${propertyName} = ${fieldNumber}${isPacked ? ' [packed=true]' : ''};`);
        }
    }

    items.forEach(function(item, index, array) {
        show_fields_recursive(item[0], item[1], indent+1, log);
    })
}

