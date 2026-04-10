/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("subjects");
  collection.indexes.push("CREATE UNIQUE INDEX idx_subjects_code ON subjects (code)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("subjects");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_subjects_code"));
  return app.save(collection);
})
