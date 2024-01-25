/*
SQLyog Community v13.2.1 (64 bit)
MySQL - 8.0.31 : Database - oceanpic
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*Table structure for table `admin_users` */

DROP TABLE IF EXISTS `admin_users`;

CREATE TABLE `admin_users` (
  `admin_user_id` bigint NOT NULL,
  `admin_user_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `admin_user_pwd` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`admin_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `admin_users` */

/*Table structure for table `api_keys` */

DROP TABLE IF EXISTS `api_keys`;

CREATE TABLE `api_keys` (
  `api_key` varchar(255) NOT NULL,
  `container_id` bigint NOT NULL,
  PRIMARY KEY (`api_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `api_keys` */

/*Table structure for table `api_log` */

DROP TABLE IF EXISTS `api_log`;

CREATE TABLE `api_log` (
  `api_log_id` bigint NOT NULL AUTO_INCREMENT,
  `url` varchar(255) NOT NULL,
  `headers` text NOT NULL,
  `method` varchar(20) NOT NULL,
  `response_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '200',
  `ip` varchar(100) NOT NULL,
  `auth_method` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `auth_entity` varchar(255) DEFAULT NULL,
  `log_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` bigint DEFAULT NULL,
  `visit_log_id` bigint DEFAULT NULL,
  PRIMARY KEY (`api_log_id`,`method`)
) ENGINE=InnoDB AUTO_INCREMENT=12601 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `api_log` */

/*Table structure for table `asso_user_group_activation_codes` */

DROP TABLE IF EXISTS `asso_user_group_activation_codes`;

CREATE TABLE `asso_user_group_activation_codes` (
  `activation_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `user_group_id` bigint NOT NULL,
  `expire_time` datetime NOT NULL DEFAULT '2099-12-31 23:59:59',
  `is_used_by` bigint DEFAULT NULL,
  `used_time` datetime DEFAULT NULL,
  `infinite` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`activation_code`,`user_group_id`),
  UNIQUE KEY `activation_code` (`activation_code`),
  KEY `is_used_by` (`is_used_by`),
  KEY `user_group_id` (`user_group_id`),
  CONSTRAINT `asso_user_group_activation_codes_ibfk_1` FOREIGN KEY (`is_used_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `asso_user_group_activation_codes_ibfk_2` FOREIGN KEY (`user_group_id`) REFERENCES `user_groups` (`user_group_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `asso_user_group_activation_codes` */

/*Table structure for table `containers` */

DROP TABLE IF EXISTS `containers`;

CREATE TABLE `containers` (
  `container_id` bigint NOT NULL,
  `inner_id` bigint NOT NULL AUTO_INCREMENT,
  `container_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `user_id` bigint NOT NULL,
  `permission_level` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '0-private,1-readable,2-free',
  `container_create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`container_id`),
  KEY `user_id` (`user_id`),
  KEY `inner_id` (`inner_id`),
  CONSTRAINT `containers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=108 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `containers` */

/*Table structure for table `ext_categories` */

DROP TABLE IF EXISTS `ext_categories`;

CREATE TABLE `ext_categories` (
  `file_ext` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `file_category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`file_ext`),
  UNIQUE KEY `file_ext` (`file_ext`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `ext_categories` */

/*Table structure for table `notices` */

DROP TABLE IF EXISTS `notices`;

CREATE TABLE `notices` (
  `notice_id` bigint NOT NULL AUTO_INCREMENT,
  `notice_title` varchar(200) NOT NULL,
  `notice_create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notice_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`notice_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `notices` */

insert  into `notices`(`notice_id`,`notice_title`,`notice_create_time`,`notice_content`) values 
(1,'欢迎来到OceanStorage','2023-11-21 00:09:21','Ocean Storage系统正式启用，原OceanPic用户数据已全部迁移至此系统。\r\n祝您使用愉快！');

/*Table structure for table `resources` */

DROP TABLE IF EXISTS `resources`;

CREATE TABLE `resources` (
  `resource_id` bigint NOT NULL,
  `inner_id` bigint NOT NULL AUTO_INCREMENT,
  `original_name` varchar(255) NOT NULL,
  `file_ext` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `user_id` bigint NOT NULL,
  `container_id` bigint NOT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_visit_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `visit_count` bigint NOT NULL DEFAULT '0',
  `file_size` bigint NOT NULL,
  PRIMARY KEY (`resource_id`),
  KEY `user_id` (`user_id`),
  KEY `inner_id` (`inner_id`),
  KEY `container_id` (`container_id`),
  CONSTRAINT `resources_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `resources_ibfk_2` FOREIGN KEY (`container_id`) REFERENCES `containers` (`container_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=598 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `resources` */

/*Table structure for table `service_keys` */

DROP TABLE IF EXISTS `service_keys`;

CREATE TABLE `service_keys` (
  `service_key_id` bigint NOT NULL AUTO_INCREMENT,
  `service_key_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `user_id` bigint NOT NULL,
  `expire_time` datetime NOT NULL,
  `security_params` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `key_content` varchar(255) NOT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`service_key_id`),
  KEY `user_id` (`user_id`),
  KEY `key_content` (`key_content`),
  CONSTRAINT `service_keys_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=170608761689694 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `service_keys` */

/*Table structure for table `user_groups` */

DROP TABLE IF EXISTS `user_groups`;

CREATE TABLE `user_groups` (
  `user_group_id` bigint NOT NULL AUTO_INCREMENT,
  `user_group_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `permission_params` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`user_group_id`),
  UNIQUE KEY `user_group_name` (`user_group_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `user_groups` */

insert  into `user_groups`(`user_group_id`,`user_group_name`,`permission_params`) values 
(4,'未激活用户','{\"maxTotalResourceSize\": 104857600, \"maxSingleResourceSize\": 104857600, \"trafficLimitPerMonth\": 524288000}'),
(5,'标准用户','{\"maxTotalResourceSize\": 10737418240, \"maxSingleResourceSize\": 838860800, \"trafficLimitPerMonth\": 1099511627776}'),
(6,'无限制用户','{\"maxTotalResourceSize\": 9223372036854775807, \"maxSingleResourceSize\": 9223372036854775807, \"trafficLimitPerMonth\": 9223372036854775807}');

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `user_name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `pwd` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `user_group` bigint NOT NULL,
  `user_group_valid_time` datetime NOT NULL DEFAULT '2099-12-31 23:59:59',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `activated` smallint NOT NULL,
  `info_params` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `mobile` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `api_key_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `user_group` (`user_group`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`user_group`) REFERENCES `user_groups` (`user_group_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `users` */

/*Table structure for table `visit_log` */

DROP TABLE IF EXISTS `visit_log`;

CREATE TABLE `visit_log` (
  `visit_log_id` bigint NOT NULL AUTO_INCREMENT,
  `visit_type` varchar(10) NOT NULL,
  `resource_id` bigint NOT NULL,
  `file_size` bigint NOT NULL,
  `visit_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`visit_log_id`),
  KEY `resource_id` (`resource_id`),
  KEY `user_id` (`user_id`),
  KEY `visit_time` (`visit_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*Data for the table `visit_log` */

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
