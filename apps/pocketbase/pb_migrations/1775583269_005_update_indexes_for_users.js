/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.indexes.push("CREATE UNIQUE INDEX idx_users_email ON users (email)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_users_email"));
  return app.save(collection);
})
