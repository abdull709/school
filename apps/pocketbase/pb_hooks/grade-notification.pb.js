/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  try {
    const studentId = e.record.get("student");
    const subjectId = e.record.get("subject");
    
    if (!studentId) {
      e.next();
      return;
    }
    
    // Get subject name for the message
    let subjectName = "a subject";
    try {
      const subject = $app.findRecordById("subjects", subjectId);
      if (subject) {
        subjectName = subject.get("subject_name") || "a subject";
      }
    } catch (err) {
      // Subject not found, use default
    }
    
    // Create notification record
    const notification = new Record($app.findCollectionByNameOrId("notifications"));
    notification.set("type", "grade_posted");
    notification.set("title", "New Grade Posted");
    notification.set("message", "A new grade has been posted for " + subjectName);
    notification.set("user_id", studentId);
    notification.set("related_id", e.record.id);
    notification.set("read", false);
    
    $app.save(notification);
  } catch (err) {
    console.log("Error creating grade notification:", err);
  }
  
  e.next();
}, "grades");