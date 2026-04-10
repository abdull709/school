/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("attendance");
  collection.listRule = "@request.auth.role = 'admin' || @request.auth.role = 'teacher' || (@request.auth.role = 'student' && student.id = @request.auth.id) || (@request.auth.role = 'parent' && student.id = @request.auth.id)";
  collection.viewRule = "@request.auth.role = 'admin' || @request.auth.role = 'teacher' || (@request.auth.role = 'student' && student.id = @request.auth.id) || (@request.auth.role = 'parent' && student.id = @request.auth.id)";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("attendance");
  collection.listRule = "@request.auth.role = 'admin' || @request.auth.role = 'teacher'";
  collection.viewRule = "@request.auth.role = 'admin' || @request.auth.role = 'teacher'";
  return app.save(collection);
})
