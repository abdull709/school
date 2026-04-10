/// <reference path="../pb_data/types.d.ts" />
onRecordAfterCreateSuccess((e) => {
  try {
    const announcementTitle = e.record.get("title") || "New Announcement";
    const announcementId = e.record.id;
    
    // Get all users from the users collection
    const allUsers = $app.findAllRecords("users", { expand: "" });
    
    if (allUsers && allUsers.length > 0) {
      for (let i = 0; i < allUsers.length; i++) {
        const user = allUsers[i];
        const userId = user.id;
        
        // Create notification record for each user
        const notification = new Record($app.findCollectionByNameOrId("notifications"));
        notification.set("type", "announcement_posted");
        notification.set("title", "New Announcement");
        notification.set("message", announcementTitle);
        notification.set("user_id", userId);
        notification.set("related_id", announcementId);
        notification.set("read", false);
        
        $app.save(notification);
      }
    }
  } catch (err) {
    console.log("Error creating announcement notifications:", err);
  }
  
  e.next();
}, "announcements");