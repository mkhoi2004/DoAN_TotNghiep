IF NOT EXISTS (SELECT 1 FROM [User] WHERE [username] = 'Admin')
INSERT INTO [User] ([id], [username], [displayName], [passwordHash], [role], [createdAt], [updatedAt]) VALUES (NEWID(), 'Admin', N'Quản trị viên', '$2b$12$uQWyMjzfAVlZEYlGBcqQseBdPnt4/Toe/8a.CZGW2qadAu/FFFQzC', 'ADMIN', GETDATE(), GETDATE());
IF NOT EXISTS (SELECT 1 FROM [User] WHERE [username] = 'TiepNhan')
INSERT INTO [User] ([id], [username], [displayName], [passwordHash], [role], [createdAt], [updatedAt]) VALUES (NEWID(), 'TiepNhan', N'Nhân viên tiếp nhận', '$2b$12$JoBrs3jIWwKjEPwp//mddeKQhUvDEsbeBB6L1lIgeBfAThYPtOz5W', 'RECEPTIONIST', GETDATE(), GETDATE());
IF NOT EXISTS (SELECT 1 FROM [User] WHERE [username] = 'BacSi')
INSERT INTO [User] ([id], [username], [displayName], [passwordHash], [role], [createdAt], [updatedAt]) VALUES (NEWID(), 'BacSi', N'Bác sĩ điều trị', '$2b$12$geaV.HEzCSWs.6BAsLOIT.Um8zUxzj79DSXqSoK8/UAbLw1gqaToS', 'DOCTOR', GETDATE(), GETDATE());
IF NOT EXISTS (SELECT 1 FROM [User] WHERE [username] = 'PhuTa')
INSERT INTO [User] ([id], [username], [displayName], [passwordHash], [role], [createdAt], [updatedAt]) VALUES (NEWID(), 'PhuTa', N'Phụ tá điều dưỡng', '$2b$12$H6x5VC.lYXhaJO/I9CAJJedD71xsKS3WvV5tNY3FowtVqpkLEZdf6', 'ASSISTANT', GETDATE(), GETDATE());
IF NOT EXISTS (SELECT 1 FROM [User] WHERE [username] = 'Ketoan')
INSERT INTO [User] ([id], [username], [displayName], [passwordHash], [role], [createdAt], [updatedAt]) VALUES (NEWID(), 'Ketoan', N'Kế toán viên', '$2b$12$Apr8DXwXcAj2Ci7zwZB3tuifjArfGqo9eIuYUphN0kYPBt0InDxAO', 'ACCOUNTANT', GETDATE(), GETDATE());
IF NOT EXISTS (SELECT 1 FROM [User] WHERE [username] = 'KeToanTruong')
INSERT INTO [User] ([id], [username], [displayName], [passwordHash], [role], [createdAt], [updatedAt]) VALUES (NEWID(), 'KeToanTruong', N'Kế toán trưởng', '$2b$12$GVdMFZ2dnWP5E0Vn6GQAL.qUORnBUdQu0vwVug/ihf3A6Jaa29GcO', 'CHIEF_ACCOUNTANT', GETDATE(), GETDATE());
IF NOT EXISTS (SELECT 1 FROM [User] WHERE [username] = 'Kho')
INSERT INTO [User] ([id], [username], [displayName], [passwordHash], [role], [createdAt], [updatedAt]) VALUES (NEWID(), 'Kho', N'Quản lý kho', '$2b$12$aeB7bPdEBS8J7TSJRW9IWeSc2PGZfyHJ6aIwFLXICzNDIIm3M3Rzy', 'INVENTORY_MANAGER', GETDATE(), GETDATE());
