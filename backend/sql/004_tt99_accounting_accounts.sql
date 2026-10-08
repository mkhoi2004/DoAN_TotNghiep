SET XACT_ABORT ON;
BEGIN TRANSACTION;
GO

INSERT INTO dbo.ChartOfAccounts (AccountCode, AccountName, CreatedBy)
SELECT account.AccountCode, account.AccountName, NULL
FROM (VALUES
    (N'1331', N'Thuế GTGT được khấu trừ của hàng hóa, dịch vụ'),
    (N'1332', N'Thuế GTGT được khấu trừ của tài sản cố định'),
    (N'211', N'Tài sản cố định hữu hình'),
    (N'2141', N'Hao mòn tài sản cố định hữu hình'),
    (N'3331', N'Thuế GTGT phải nộp'),
    (N'521', N'Các khoản giảm trừ doanh thu'),
    (N'621', N'Chi phí nguyên liệu, vật liệu trực tiếp'),
    (N'622', N'Chi phí nhân công trực tiếp'),
    (N'627', N'Chi phí sản xuất chung'),
    (N'711', N'Thu nhập khác')
) account(AccountCode, AccountName)
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.ChartOfAccounts currentAccount
    WHERE currentAccount.AccountCode = account.AccountCode
);
GO

COMMIT TRANSACTION;
GO
