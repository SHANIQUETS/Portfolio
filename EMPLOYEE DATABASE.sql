USE The_Alchemy;

-- create table employee
CREATE TABLE employee (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(20) NOT NULL,
    last_name VARCHAR(20) NOT NULL,
    dept VARCHAR(20) NOT NULL,
    salary FLOAT NOT NULL,
    birth_date DATE
);


-- insert data into the table
INSERT INTO EMPLOYEE (employee_id, first_name, last_name, dept, salary, birth_date)
VALUES 
(default, 'Shanay', 'Williams', 'Floor', 28000.00, '1995-05-20'),
(default, 'Kenai', 'Holding', 'Kitchen', 29000.00, '2003-11-06'),
(default, 'Aalyiah', 'Peterking', 'Floor', 28000.00, '2000-01-11'),
(default, 'Mario', 'Dale', 'Bar', 30000.00, '1970-05-06'),
(default, 'Jonathan', 'Blakely', 'Bar', 30000.00, '1992-02-23'),
(default, 'Telisa', 'Smith', 'Bar', 35000.00, '1996-08-16'),
(default, 'Tamardo', 'Grant', 'Kitchen', 28000.00, '1993-09-13'),
(default, 'Shania', 'Mckenzie', 'Kitchen', 26000.00, '1995-10-23'),
(default, 'Shanique', 'Smith', 'Manager', 100000.00, '1993-05-06'),
(default, 'Janel', 'Edwards', 'Manager', 100000.00, '1995-02-02'),
(default, 'Shania', 'Wade', 'Supervisor', 45000, '1993-03-31');

-- create orders table
CREATE TABLE Orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
);


-- Inserting data into the Orders table
INSERT INTO Orders (customer_id, order_date, total_amount)
VALUES 
(1, '2024-03-20', 120.50),
(3, '2024-03-21', 75.20),
(2, '2024-03-22', 200.00),
(4, '2024-03-23', 50.75),
(1, '2024-03-23', 90.00),
(5, '2024-03-24', 150.30),
(2, '2024-03-25', 180.25),
(3, '2024-03-25', 95.60);






 