-- Clean slate (drop child first, then parent)
DROP TABLE IF EXISTS tb_user;
DROP TABLE IF EXISTS tb_province;

-- Provinces (parent)
CREATE TABLE tb_province (
  province_id INT(11) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

INSERT INTO tb_province (province_id, name) VALUES
  (10, 'Bangkok'),
  (50, 'Chiang Mai'),
  (20, 'Chonburi'),
  (30, 'Nakhon Ratchasima'),
  (40, 'Khon Kaen'),
  (83, 'Phuket'),
  (12, 'Nonthaburi'),
  (13, 'Pathum Thani'),
  (11, 'Samut Prakan'),
  (84, 'Surat Thani');

-- Users (child) with FK to tb_province
CREATE TABLE tb_user (
  user_id     INT(11) NOT NULL AUTO_INCREMENT,
  firstname   VARCHAR(255) NOT NULL,
  lastname    VARCHAR(255) NOT NULL,
  province_id INT(11) NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_province
    FOREIGN KEY (province_id)
    REFERENCES tb_province (province_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- Mock users (some with province, some NULL)
INSERT INTO tb_user (firstname, lastname, province_id) VALUES
  ('Aom',   'Wattanakul', 10),  -- Bangkok
  ('Beam',  'Prasert',    50),  -- Chiang Mai
  ('Chan',  'Suksawat',   20),  -- Chonburi
  ('Dee',   'Thongchai',  83),  -- Phuket
  ('Fern',  'Kittisak',   11),  -- Samut Prakan
  ('Golf',  'Rattanakorn',NULL),-- Unknown province
  ('Ice',   'Pannipa',    84),  -- Surat Thani
  ('June',  'Thanapat',   12);  -- Nonthaburi

-- Example query to see the join result
SELECT
  u.user_id, u.firstname, u.lastname,
  p.name AS province_name
FROM tb_user u
LEFT JOIN tb_province p ON p.province_id = u.province_id
ORDER BY u.user_id;

-- (Optional) Try an invalid insert to see FK protection (this will FAIL)
-- INSERT INTO tb_user (firstname, lastname, province_id)
-- VALUES ('Korn', 'Meechai', 9999);