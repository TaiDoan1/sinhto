const { removeDiacritics } = require('./vietnamese');

const vi = removeDiacritics;

/** Danh mục nguyên liệu — tồn kho luôn bắt đầu từ 0, chỉ tăng qua Nhập kho */
function getInventoryCatalog() {
  return [
    ['INV-001', vi('Dau tay'), 'kg', 0, 5.0, 80000, 'fruit'],
    ['INV-002', vi('Xoai'), 'kg', 0, 6.0, 40000, 'fruit'],
    ['INV-003', vi('Chuoi'), 'kg', 0, 3.0, 20000, 'fruit'],
    ['INV-004', vi('Bo'), 'kg', 0, 5.0, 60000, 'fruit'],
    ['INV-005', vi('Dua'), 'kg', 0, 2.0, 25000, 'fruit'],
    ['INV-006', vi('Viet quat'), 'kg', 0, 2.0, 150000, 'fruit'],
    ['INV-007', vi('Rau bina'), 'kg', 0, 1.5, 35000, 'fruit'],
    ['INV-024', vi('Dau tam'), 'kg', 0, 1.5, 120000, 'fruit'],
    ['INV-025', vi('Phuc bon tu'), 'kg', 0, 1.5, 150000, 'fruit'],
    ['INV-026', vi('Thanh long'), 'kg', 0, 2.0, 35000, 'fruit'],
    ['INV-008', vi('Sua tuoi'), 'lít', 0, 10.0, 28000, 'dairy'],
    ['INV-009', vi('Sua chua'), 'kg', 0, 4.0, 45000, 'dairy'],
    ['INV-010', 'Whey Protein', 'gói', 0, 20, 30000, 'protein'],
    ['INV-012', vi('Sua A2'), 'lít', 0, 2, 35000, 'dairy'],
    ['INV-013', vi('Bot dau ha lan'), 'kg', 0, 1, 45000, 'protein'],
    ['INV-014', vi('Mat ong'), 'lít', 0, 1.0, 120000, 'topping'],
    ['INV-015', 'Collagen', 'gói', 0, 5, 49000, 'protein'],
    ['INV-016', vi('Yen mach'), 'kg', 0, 2, 25000, 'topping'],
    ['INV-017', vi('Hat chia'), 'kg', 0, 2, 30000, 'topping'],
    ['INV-018', vi('Dua say'), 'kg', 0, 2, 35000, 'topping'],
    ['INV-019', vi('Co ngot'), 'kg', 0, 1, 20000, 'topping'],
    ['INV-020', vi('Mat mia'), 'lít', 0, 1, 15000, 'topping'],
    ['INV-021', vi('Cha la'), 'kg', 0, 1, 40000, 'topping'],
    ['INV-022', vi('Bo hat'), 'kg', 0, 2, 55000, 'topping'],
    ['INV-023', vi('Hat dac'), 'kg', 0, 1, 35000, 'topping'],
  ];
}

function getSampleEmployees() {
  return [
    ['1', vi('Nguyen Van An'), 'NV-001', 'nguyenvanan@fitblend.vn', '0901234567', '001234567890', '1995-03-15', vi('123 Le Loi, Phuong Ben Nghe, Quan 1, TP.HCM'), 'CN1', 'manager', 12000000, '2023-01-10', 'vanan', '123', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'],
    ['2', vi('Tran Thi Binh'), 'NV-002', 'tranthibinh@fitblend.vn', '0902345678', '002345678901', '1998-07-22', vi('456 Nguyen Hue, Phuong Ben Nghe, Quan 1, TP.HCM'), 'CN1', 'cashier', 8000000, '2023-02-15', 'thibinh', '123', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop'],
    ['3', vi('Le Minh Cuong'), 'NV-003', 'leminhcuong@fitblend.vn', '0903456789', '003456789012', '1997-11-08', vi('789 Pasteur, Phuong Vo Thi Sau, Quan 3, TP.HCM'), 'CN2', 'bartender', 9000000, '2023-03-01', 'minhcuong', '123', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop'],
    ['4', vi('Pham Thu Dung'), 'NV-004', 'phamthudung@fitblend.vn', '0904567890', '004567890123', '1999-05-30', vi('321 Dien Bien Phu, Phuong Dakao, Quan 1, TP.HCM'), 'CN1', 'bartender', 8500000, '2023-04-20', 'thudung', '123', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'],
    ['5', vi('Hoang Quoc Hung'), 'NV-005', 'hoangquochung@fitblend.vn', '0905678901', '005678901234', '1996-09-12', vi('654 Cach Mang Thang 8, Phuong 11, Quan 3, TP.HCM'), 'CN2', 'manager', 11500000, '2023-01-15', 'quochung', '123', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop'],
    ['6', vi('Vo Thi Kim'), 'NV-006', 'vothikim@fitblend.vn', '0906789012', '006789012345', '2000-01-25', vi('147 Xa lo Ha Noi, Phuong Thao Dien, Quan 2, TP.HCM'), 'CN3', 'server', 7500000, '2023-05-10', 'thikim', '123', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop'],
    ['7', vi('Dang Van Long'), 'NV-007', 'dangvanlong@fitblend.vn', '0907890123', '007890123456', '1998-12-03', vi('258 Vo Van Tan, Phuong 5, Quan 3, TP.HCM'), 'CN2', 'server', 7500000, '2023-06-01', 'vanlong', '123', 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop'],
    ['8', vi('Bui Thi Mai'), 'NV-008', 'buithimai@fitblend.vn', '0908901234', '008901234567', '1997-06-18', vi('369 Ly Thuong Kiet, Phuong 14, Quan 10, TP.HCM'), 'CN3', 'cashier', 8000000, '2023-02-28', 'thimai', '123', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop'],
    ['9', vi('Ngo Minh Nam'), 'NV-009', 'ngominhnam@fitblend.vn', '0909012345', '009012345678', '1999-08-27', vi('741 Tran Hung Dao, Phuong 2, Quan 5, TP.HCM'), 'CN3', 'bartender', 9000000, '2023-07-15', 'minhnam', '123', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop'],
    ['10', vi('Ly Thi Oanh'), 'NV-010', 'lythioanh@fitblend.vn', '0900123456', '010123456789', '2001-02-14', vi('852 Hoang Van Thu, Phuong 4, Quan Tan Binh, TP.HCM'), 'CN1', 'server', 7500000, '2023-08-01', 'thioanh', '123', 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop'],
    ['11', vi('Truong Van Phuc'), 'NV-011', 'truongvanphuc@fitblend.vn', '0911234567', '011234567890', '1996-04-20', vi('963 Cong Hoa, Phuong 12, Quan Tan Binh, TP.HCM'), 'CN3', 'manager', 12500000, '2023-01-05', 'vanphuc', '123', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop'],
    ['12', vi('Dinh Thi Quynh'), 'NV-012', 'dinhthiquynh@fitblend.vn', '0912345678', '012345678901', '2000-10-05', vi('159 Nguyen Dinh Chieu, Phuong Da Kao, Quan 1, TP.HCM'), 'CN2', 'cleaner', 6500000, '2023-09-01', 'thiquynh', '123', 'https://images.unsplash.com/photo-1502378735452-bc7d86632805?w=400&h=400&fit=crop'],
    ['13', vi('Nguyen Thi Lan'), 'NV-013', 'nguyenthilan@fitblend.vn', '0913456789', '013456789012', '1998-04-12', vi('88 Vo Van Tan, Phuong 6, Quan 3, TP.HCM'), 'CN1', 'online_sales', 9000000, '2024-01-15', 'thilan', '123', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop'],
    ['14', vi('Tran Van Hieu'), 'NV-014', 'tranvanhieu@fitblend.vn', '0914567890', '014567890123', '1997-08-20', vi('55 Nguyen Trai, Phuong 3, Quan 5, TP.HCM'), 'CN1', 'online_sales', 9000000, '2024-02-01', 'vanhieu', '123', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop'],
  ];
}

module.exports = { getInventoryCatalog, getSampleEmployees, vi };
