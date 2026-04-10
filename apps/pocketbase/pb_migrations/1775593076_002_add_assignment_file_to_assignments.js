/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("assignments");

  const existing = collection.fields.getByName("assignment_file");
  if (existing) {
    if (existing.type === "file") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("assignment_file"); // exists with wrong type, remove first
  }

  collection.fields.add(new FileField({
    name: "assignment_file",
    required: false,
    maxSelect: 1,
    maxSize: 20971520
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("assignments");
  collection.fields.removeByName("assignment_file");
  return app.save(collection);
})
