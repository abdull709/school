/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("staff");
  collection.indexes.push("CREATE UNIQUE INDEX idx_staff_employee_id ON staff (employee_id)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("staff");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_staff_employee_id"));
  return app.save(collection);
})
