import g4f from 'g4f';
console.log('Доступные свойства в g4f:', Object.keys(g4f));
console.log('Свойства объекта g4f.G4F:', Object.keys(g4f.G4F || {}));
console.log('Свойства объекта g4f.ChatCompletion:', Object.keys(g4f.ChatCompletion || {}));
console.log('Свойства объекта g4f.chunkProcessor:', Object.keys(g4f.chunkProcessor || {}));
