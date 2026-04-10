/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("assignments");
  collection.listRule = "@request.auth.role = 'teacher' || @request.auth.role = 'admin' || @request.auth.role = 'student'";
  collection.viewRule = "@request.auth.role = 'teacher' || @request.auth.role = 'admin' || @request.auth.role = 'student'";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("assignments");
  collection.listRule = "@request.auth.role = 'admin' || @request.auth.role = 'teacher' || @request.auth.role = 'student'";
  collection.viewRule = "@request.auth.role = 'admin' || @request.auth.role = 'teacher' || @request.auth.role = 'student'";
  return app.save(collection);
})
