/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("students");
  collection.indexes.push("CREATE UNIQUE INDEX idx_students_admission_number ON students (admission_number)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("students");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_students_admission_number"));
  return app.save(collection);
})
