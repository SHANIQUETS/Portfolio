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

-- fetch all the employees that work on dept floor
SELECT * 
FROM EMPLOYEE 
WHERE dept = 'Floor';

-- find distinct department elminate repeats
SELECT distinct dept
FROM employee;

-- find the average salary
SELECT AVG(salary) AS average_salary
FROM employee;

-- Find employees born after 1993 and salary less than 40000
SELECT *
FROM employee
WHERE Birth_date > 01-01-1993  AND salary < '40000';

-- Find employees born after 1993 with salary greater than 40000
SELECT *
FROM employee
WHERE Birth_date > 01-01-1993  AND salary > '40000';

-- Average salary for each department
SELECT dept, AVG(salary) AS average_rate
FROM EMPLOYEE
GROUP BY dept;

-- Find all the employees except those from floor dept
SELECT * 
FROM EMPLOYEE
WHERE dept != 'Floor';

-- Find employee where employee id is 2 
SELECT *
FROM employee
WHERE employee_id = 2; 

-- JOIN customers table with employee table where there is an 's' in the names
SELECT c.full_name, e.first_name, customer_id, employee_id
FROM customers c
JOIN employee e
WHERE first_name LIKE '%s%'

-- Create a stored procedure to retrieve employees by department
DELIMITER //
CREATE PROCEDURE GetEmployeesByDepartment(IN dept_name VARCHAR(20))
BEGIN
    SELECT * FROM employee WHERE dept = dept_name;
END //
DELIMITER ;

-- Call the stored procedure to retrieve employees from the 'Kitchen' department
CALL GetEmployeesByDepartment('Kitchen');


-- Create Department table for normalization
CREATE TABLE Department (
  deptId INTEGER PRIMARY KEY,
  deptName TEXT NOT NULL
);

-- Create Employee table for normalization
CREATE TABLE Employees (
  empId INTEGER PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  deptId INTEGER NOT NULL,
  FOREIGN KEY (deptId) REFERENCES Department(deptId)
);

-- Deleting deparment 1-3 associated with employees
DELETE FROM employees WHERE deptId IN (1, 2, 3);

-- Deleting department 1-3
DELETE FROM Department WHERE deptId IN (1, 2, 3);

-- Insert department data with new unique deptId values
INSERT INTO Department (deptId, deptName) VALUES
(101, 'Floor'),
(102, 'Kitchen'),
(103, 'Bar');

-- Update department IDs of associated employees after reinserting departments
UPDATE Employees SET deptId = 101 WHERE deptId = 1;
UPDATE Employees SET deptId = 102 WHERE deptId = 2;
UPDATE Employees SET deptId = 103 WHERE deptId = 3;

-- Insert employees data empId
INSERT INTO Employees (empId, first_name, last_name, deptId) VALUES 
(1, 'Shanay', 'Williams', 101),
(2, 'Kenai', 'Holding', 102),
(3, 'Aalyiah', 'Peterking', 101),
(4, 'Tamardo', 'Grant', 102),
(5, 'Shania', 'Mckenzie', 102),
(6, 'Mario', 'Dale', 103),
(7, 'Jonathan', 'Blakely', 103),
(8, 'Telisa', 'Smith', 103);

-- Fetch employees data with corresponding department names
SELECT
    es.empId,
    es.first_name,
    es.last_name,
    d.deptName AS department
FROM
    Employees es
JOIN
    Department d
    ON es.deptId = d.deptId;





 
