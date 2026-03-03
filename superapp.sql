-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 03, 2026 at 03:29 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `superapp`
--

-- --------------------------------------------------------

--
-- Table structure for table `comments`
--

CREATE TABLE `comments` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `comments`
--

INSERT INTO `comments` (`id`, `user_id`, `post_id`, `content`, `created_at`) VALUES
(1, 3, 3, 'hii', '2026-03-01 15:46:51'),
(2, 2, 1, 'wow', '2026-03-02 16:26:46');

-- --------------------------------------------------------

--
-- Table structure for table `communities`
--

CREATE TABLE `communities` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `banner_url` varchar(255) DEFAULT NULL,
  `creator_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `communities`
--

INSERT INTO `communities` (`id`, `name`, `description`, `banner_url`, `creator_id`, `created_at`) VALUES
(1, 'One', 'Hehe', NULL, 2, '2026-03-03 08:21:26');

-- --------------------------------------------------------

--
-- Table structure for table `community_members`
--

CREATE TABLE `community_members` (
  `id` int(11) NOT NULL,
  `community_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('member','admin') DEFAULT 'member'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `community_members`
--

INSERT INTO `community_members` (`id`, `community_id`, `user_id`, `role`) VALUES
(5, 1, 3, 'member'),
(6, 1, 4, 'member');

-- --------------------------------------------------------

--
-- Table structure for table `community_posts`
--

CREATE TABLE `community_posts` (
  `id` int(11) NOT NULL,
  `community_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `community_posts`
--

INSERT INTO `community_posts` (`id`, `community_id`, `user_id`, `content`, `image_url`, `created_at`) VALUES
(1, 1, 3, 'yooo', '/uploads/1772526123308.jpeg', '2026-03-03 08:22:03'),
(2, 1, 3, 'hii', NULL, '2026-03-03 10:47:58');

-- --------------------------------------------------------

--
-- Table structure for table `community_post_comments`
--

CREATE TABLE `community_post_comments` (
  `id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `community_post_comments`
--

INSERT INTO `community_post_comments` (`id`, `post_id`, `user_id`, `content`, `created_at`) VALUES
(1, 1, 2, 'wow', '2026-03-03 10:21:40'),
(2, 1, 2, 'wow', '2026-03-03 10:21:40');

-- --------------------------------------------------------

--
-- Table structure for table `community_post_likes`
--

CREATE TABLE `community_post_likes` (
  `id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `community_post_likes`
--

INSERT INTO `community_post_likes` (`id`, `post_id`, `user_id`) VALUES
(2, 1, 2);

-- --------------------------------------------------------

--
-- Table structure for table `connections`
--

CREATE TABLE `connections` (
  `id` int(11) NOT NULL,
  `requester_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `status` enum('pending','accepted') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `connections`
--

INSERT INTO `connections` (`id`, `requester_id`, `receiver_id`, `status`, `created_at`) VALUES
(1, 2, 3, 'accepted', '2026-03-01 11:38:16'),
(2, 4, 2, 'accepted', '2026-03-02 14:08:57'),
(3, 2, 4, 'accepted', '2026-03-02 14:10:13'),
(4, 2, 4, 'accepted', '2026-03-02 14:10:14'),
(5, 2, 4, 'accepted', '2026-03-02 14:10:14'),
(6, 2, 5, 'accepted', '2026-03-03 02:34:25');

-- --------------------------------------------------------

--
-- Table structure for table `likes`
--

CREATE TABLE `likes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `likes`
--

INSERT INTO `likes` (`id`, `user_id`, `post_id`) VALUES
(3, 2, 3);

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `is_request` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `media_url` varchar(255) DEFAULT NULL,
  `media_type` varchar(50) DEFAULT NULL,
  `reply_to_id` int(11) DEFAULT NULL,
  `is_pinned` tinyint(1) DEFAULT 0,
  `is_forwarded` tinyint(1) DEFAULT 0,
  `reaction` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`id`, `sender_id`, `receiver_id`, `content`, `is_request`, `created_at`, `media_url`, `media_type`, `reply_to_id`, `is_pinned`, `is_forwarded`, `reaction`, `is_read`) VALUES
(1, 3, 1, 'hello', 1, '2026-03-01 11:29:17', NULL, NULL, NULL, 0, 0, NULL, 0),
(2, 3, 2, 'hello', 1, '2026-03-01 11:29:26', NULL, NULL, NULL, 0, 0, NULL, 1),
(3, 2, 3, 'hii', 1, '2026-03-01 11:29:39', NULL, NULL, NULL, 0, 0, NULL, 1),
(4, 2, 3, 'hello', 0, '2026-03-01 11:48:32', NULL, NULL, NULL, 0, 0, NULL, 1),
(5, 3, 2, 'Replying to your story: \"hii\"', 0, '2026-03-01 13:46:02', NULL, NULL, NULL, 0, 0, NULL, 1),
(6, 2, 3, '', 0, '2026-03-02 03:44:02', '/uploads/1772423041810.jpg', 'image', NULL, 0, 0, NULL, 1),
(7, 2, 3, '', 0, '2026-03-02 03:44:37', '/uploads/1772423077572.docx', 'document', NULL, 0, 0, NULL, 1),
(8, 2, 3, 'hii', 0, '2026-03-02 07:57:46', NULL, NULL, NULL, 0, 0, NULL, 1),
(9, 2, 3, 'hello', 0, '2026-03-02 07:57:54', NULL, NULL, NULL, 0, 0, NULL, 1),
(10, 3, 2, '📹 Missed Video call', 0, '2026-03-02 08:06:54', NULL, NULL, NULL, 0, 0, NULL, 1),
(11, 3, 2, '📞 Missed Audio call', 0, '2026-03-02 08:24:34', NULL, NULL, NULL, 0, 0, NULL, 1),
(12, 3, 2, '📹 Missed Video call', 0, '2026-03-02 08:24:39', NULL, NULL, NULL, 0, 0, NULL, 1),
(13, 3, 2, '📹 Missed Video call', 0, '2026-03-02 08:28:26', NULL, NULL, NULL, 0, 0, NULL, 1),
(14, 3, 2, '📹 Missed Video call', 0, '2026-03-02 08:28:34', NULL, NULL, NULL, 0, 0, NULL, 1),
(15, 3, 2, '📞 Missed Audio call', 0, '2026-03-02 08:28:49', NULL, NULL, NULL, 0, 0, NULL, 1),
(16, 3, 2, '📹 Missed Video call', 0, '2026-03-02 08:39:09', NULL, NULL, NULL, 0, 0, NULL, 1),
(17, 3, 2, '📹 Missed Video call', 0, '2026-03-02 08:39:14', NULL, NULL, NULL, 0, 0, NULL, 1),
(18, 3, 2, 'hii', 0, '2026-03-02 08:46:35', NULL, NULL, NULL, 0, 0, NULL, 1),
(19, 3, 2, 'hello', 0, '2026-03-02 08:46:41', NULL, NULL, NULL, 0, 0, NULL, 1),
(20, 3, 2, 'ji', 0, '2026-03-02 08:46:44', NULL, NULL, NULL, 0, 0, NULL, 1),
(21, 2, 3, 'huu', 0, '2026-03-02 08:47:06', NULL, NULL, NULL, 0, 0, NULL, 1),
(22, 3, 2, 'hii', 0, '2026-03-02 08:57:28', NULL, NULL, NULL, 0, 0, NULL, 1),
(23, 2, 3, 'hii', 0, '2026-03-02 08:57:37', NULL, NULL, NULL, 0, 0, NULL, 1),
(24, 2, 3, 'gi', 0, '2026-03-02 08:57:42', NULL, NULL, NULL, 0, 0, NULL, 1),
(25, 3, 2, 'hi', 0, '2026-03-02 08:57:45', NULL, NULL, NULL, 0, 0, NULL, 1),
(26, 3, 2, 'yo', 0, '2026-03-02 08:57:50', NULL, NULL, NULL, 0, 0, NULL, 1),
(27, 3, 2, 'hii', 0, '2026-03-02 08:57:55', NULL, NULL, NULL, 0, 0, NULL, 1),
(28, 3, 2, 'gggg', 0, '2026-03-02 08:58:06', NULL, NULL, NULL, 0, 0, NULL, 1),
(29, 2, 3, '📹 Video call ended • 23s', 0, '2026-03-02 09:09:13', NULL, NULL, NULL, 0, 0, NULL, 1),
(30, 3, 2, '📞 Audio call ended • 6s', 0, '2026-03-02 09:09:23', NULL, NULL, NULL, 0, 0, NULL, 1),
(31, 3, 2, 'hii', 0, '2026-03-02 09:30:23', NULL, NULL, NULL, 0, 0, NULL, 1),
(32, 3, 2, 'hello', 0, '2026-03-02 09:30:37', NULL, NULL, NULL, 0, 0, NULL, 1),
(38, 4, 2, 'Hi', 0, '2026-03-02 14:10:40', NULL, NULL, NULL, 0, 0, NULL, 1),
(39, 4, 2, '', 0, '2026-03-02 14:28:47', '/uploads/1772461727125.heic', 'image', NULL, 0, 0, NULL, 1),
(40, 2, 5, 'hello sir', 0, '2026-03-03 02:34:42', NULL, NULL, NULL, 0, 0, NULL, 1),
(41, 5, 2, 'YES ', 0, '2026-03-03 02:35:03', NULL, NULL, NULL, 0, 0, NULL, 1),
(42, 5, 2, 'Good morning ', 0, '2026-03-03 02:35:15', NULL, NULL, NULL, 0, 0, NULL, 1),
(43, 3, 2, 'hi', 0, '2026-03-03 03:08:50', NULL, NULL, NULL, 0, 0, NULL, 1),
(44, 2, 3, 'hello', 0, '2026-03-03 03:09:48', NULL, NULL, NULL, 0, 0, NULL, 1),
(45, 2, 3, 'hii', 0, '2026-03-03 03:09:59', NULL, NULL, NULL, 0, 0, NULL, 1),
(46, 3, 2, 'hii', 0, '2026-03-03 03:54:56', NULL, NULL, NULL, 0, 0, NULL, 1),
(47, 2, 4, '{\"board\":[\"X\",null,\"O\",null,\"O\",\"O\",\"X\",\"X\",\"O\"],\"nextTurn\":2,\"playerX\":2,\"playerO\":4,\"winner\":\"O\"}', 0, '2026-03-03 07:59:56', NULL, 'tictactoe', NULL, 0, 0, NULL, 1),
(48, 2, 4, '{\"board\":[null,\"X\",\"O\",\"O\",\"O\",\"O\",\"X\",null,\"X\"],\"nextTurn\":2,\"playerX\":2,\"playerO\":4,\"winner\":\"O\"}', 0, '2026-03-03 08:00:35', NULL, 'tictactoe', NULL, 0, 0, NULL, 1),
(49, 2, 4, '{\"board\":[\"O\",\"O\",\"X\",\"X\",\"O\",\"O\",\"O\",\"X\",\"X\"],\"nextTurn\":2,\"playerX\":2,\"playerO\":4,\"winner\":\"Draw\"}', 0, '2026-03-03 08:00:56', NULL, 'tictactoe', NULL, 0, 0, NULL, 1),
(50, 4, 2, '{\"board\":[\"O\",null,\"X\",\"X\",\"X\",null,\"O\",\"O\",\"O\"],\"nextTurn\":4,\"playerX\":4,\"playerO\":2,\"winner\":\"O\"}', 0, '2026-03-03 08:01:15', NULL, 'tictactoe', NULL, 0, 0, NULL, 1),
(51, 2, 4, '{\"board\":[\"X\",null,\"O\",\"O\",\"O\",\"O\",\"X\",null,\"X\"],\"nextTurn\":2,\"playerX\":2,\"playerO\":4,\"winner\":\"O\"}', 0, '2026-03-03 08:01:29', NULL, 'tictactoe', NULL, 0, 0, NULL, 1),
(52, 2, 4, '{\"player1\":2,\"player2\":4,\"p1Choice\":\"✋\",\"p2Choice\":\"✋\",\"winner\":\"Draw\"}', 0, '2026-03-03 08:07:52', NULL, 'rps', NULL, 0, 0, NULL, 1),
(53, 4, 2, '{\"player1\":4,\"player2\":2,\"p1Choice\":\"✊\",\"p2Choice\":\"✊\",\"winner\":\"Draw\"}', 0, '2026-03-03 08:08:06', NULL, 'rps', NULL, 0, 0, NULL, 1),
(54, 2, 4, '{\"player1\":2,\"player2\":4,\"p1Choice\":\"✌️\",\"p2Choice\":\"✌️\",\"winner\":\"Draw\"}', 0, '2026-03-03 08:08:15', NULL, 'rps', NULL, 0, 0, NULL, 1),
(55, 4, 2, '{\"player1\":4,\"player2\":2,\"p1Choice\":\"✊\",\"p2Choice\":\"✋\",\"winner\":2}', 0, '2026-03-03 08:08:16', NULL, 'rps', NULL, 0, 0, NULL, 1),
(56, 4, 2, '{\"player1\":4,\"player2\":2,\"p1Choice\":\"✋\",\"p2Choice\":\"✌️\",\"winner\":2}', 0, '2026-03-03 08:08:31', NULL, 'rps', NULL, 0, 0, NULL, 1),
(57, 4, 2, '{\"player1\":4,\"player2\":2,\"p1Choice\":\"✊\",\"p2Choice\":\"✊\",\"winner\":\"Draw\"}', 0, '2026-03-03 08:08:41', NULL, 'rps', NULL, 0, 0, NULL, 1),
(58, 2, 4, '{\"player1\":2,\"player2\":4,\"p1Choice\":\"✋\",\"p2Choice\":\"✋\",\"winner\":\"Draw\"}', 0, '2026-03-03 08:08:45', NULL, 'rps', NULL, 0, 0, NULL, 1),
(59, 4, 2, '{\"player1\":4,\"player2\":2,\"p1Choice\":\"✋\",\"p2Choice\":\"✌️\",\"winner\":2}', 0, '2026-03-03 08:08:52', NULL, 'rps', NULL, 0, 0, NULL, 1),
(60, 2, 4, '{\"player1\":2,\"player2\":4,\"p1Choice\":\"✊\",\"p2Choice\":\"✌️\",\"winner\":2}', 0, '2026-03-03 08:08:58', NULL, 'rps', NULL, 0, 0, NULL, 1),
(61, 4, 2, '{\"player1\":4,\"player2\":2,\"p1Choice\":\"✋\",\"p2Choice\":\"✌️\",\"winner\":2}', 0, '2026-03-03 08:09:04', NULL, 'rps', NULL, 0, 0, NULL, 1),
(62, 4, 2, '{\"player1\":4,\"player2\":2,\"p1Choice\":\"✋\",\"p2Choice\":\"✋\",\"winner\":\"Draw\"}', 0, '2026-03-03 08:09:08', NULL, 'rps', NULL, 0, 0, NULL, 1),
(63, 4, 2, '{\"player1\":4,\"player2\":2,\"p1Choice\":\"✋\",\"p2Choice\":\"✌️\",\"winner\":2}', 0, '2026-03-03 08:09:12', NULL, 'rps', NULL, 0, 0, NULL, 1),
(64, 4, 2, '{\"player1\":4,\"player2\":2,\"p1Choice\":\"✊\",\"p2Choice\":\"✊\",\"winner\":\"Draw\"}', 0, '2026-03-03 08:09:18', NULL, 'rps', NULL, 0, 0, NULL, 1),
(65, 4, 2, '{\"player1\":4,\"player2\":2,\"p1Choice\":\"✌️\",\"p2Choice\":\"✋\",\"winner\":4}', 0, '2026-03-03 08:09:23', NULL, 'rps', NULL, 0, 0, NULL, 1),
(66, 4, 2, '{\"player1\":4,\"player2\":2,\"p1Choice\":\"✋\",\"p2Choice\":\"✌️\",\"winner\":2}', 0, '2026-03-03 08:09:28', NULL, 'rps', NULL, 0, 0, NULL, 1),
(67, 3, 2, 'hii', 0, '2026-03-03 10:46:24', NULL, NULL, NULL, 0, 0, NULL, 1),
(68, 3, 2, 'hello', 0, '2026-03-03 10:46:32', NULL, NULL, NULL, 0, 0, NULL, 1),
(69, 3, 2, 'hii', 0, '2026-03-03 10:48:36', NULL, NULL, NULL, 0, 0, NULL, 1),
(70, 3, 2, 'hii', 0, '2026-03-03 10:53:20', NULL, NULL, NULL, 0, 0, NULL, 1),
(71, 3, 2, 'hii', 0, '2026-03-03 11:01:34', NULL, NULL, NULL, 0, 0, NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `posts`
--

CREATE TABLE `posts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `image_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `posts`
--

INSERT INTO `posts` (`id`, `user_id`, `content`, `created_at`, `image_url`) VALUES
(1, 2, 'hii', '2026-03-01 10:52:57', NULL),
(2, 3, 'yo\n', '2026-03-01 10:54:05', NULL),
(3, 3, 'lord hanuman\r\n', '2026-03-01 11:08:08', '/uploads/1772363288614.jpeg');

-- --------------------------------------------------------

--
-- Table structure for table `push_subscriptions`
--

CREATE TABLE `push_subscriptions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `subscription` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`subscription`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `push_subscriptions`
--

INSERT INTO `push_subscriptions` (`id`, `user_id`, `subscription`) VALUES
(1, 2, '{\"endpoint\":\"https://fcm.googleapis.com/fcm/send/cw2vedB-2wk:APA91bHFzHn28UGiYJc08KUCNay5LQLHKN7KtBsijXW8bZzLtJjHKoEIwUVDWl12hC5B1ic08p7aeiFTx2K9Wp4imGxHOj680OhNvm7p_yWWybzAwXxTJZV3iqsGGD895BEeCW0okvrh\",\"expirationTime\":null,\"keys\":{\"p256dh\":\"BAZ-Q8eP7tZMmd-pkuG6ncSaW__YPd9kYLRzlmmR-pbkYsGQCjJG0wkV4jaf89qdJlB22x2g0vaeyE_T7_3v-Fg\",\"auth\":\"LmCw2bocGMzaE645Z_gIKg\"}}'),
(2, 2, '{\"endpoint\":\"https://fcm.googleapis.com/fcm/send/ct94Q0-gE9w:APA91bGv8R235sy_TjpWKBuy-dh_tbPnPLsGkSvTO7QYjly3_vYZwTReBS7Ij0CRS0Fxr_iZaSluCUL3ThwW6Fkxdaa1Xs5QfvlPZNwFfNnnN0iF_SrBJm7jAuJIaFK0QbnfuXB4KxHS\",\"expirationTime\":null,\"keys\":{\"p256dh\":\"BOHlBEhestVR8ijuBmQ7AJFY6VozejV0j8cuwOkrVhkrKf-T0Mr-l7blNT_sVUHEeyw3ima0wn9DjP9hvlurmWE\",\"auth\":\"0Apqd9hw6IP6YnNk9L9O6w\"}}'),
(3, 3, '{\"endpoint\":\"https://fcm.googleapis.com/fcm/send/fWQcZO2JPLM:APA91bFXqURYOsfIQT-Coe5RJVV3CXtFSWbbVhjF5YkXQXsZFqJJ_o28UyB1hCyc9MgTd_uagDSUMpj4PjFBu5MPEbf0K4ITvBVKg9k1ub3u5M77GHvEOTheJWMvIC2JEpcttZW2SQ0U\",\"expirationTime\":null,\"keys\":{\"p256dh\":\"BFeZlLFojb-cPvJCH5x2alCcNKqscZFxqPXb2BKEqz9djRn0AOp0rAdY_F7aEv2N2A3_BYqrji3z5aQhG4qP2vY\",\"auth\":\"ecdSzYd6RNC2STMMR-SHJQ\"}}'),
(4, 3, '{\"endpoint\":\"https://fcm.googleapis.com/fcm/send/fj9dZVxEVGo:APA91bEDtm7CpTo5MGjtYJlYd8HReKaTfeEryKijFqMFWr9B3deFJfoakl2nSoPJC_Y-ULj2wkjcb2idjGTkXOWjCuDb7eqAhWILDXsNV0AcQ8KmVEHc8mjPT9FaKYQul0knfepnQWc3\",\"expirationTime\":null,\"keys\":{\"p256dh\":\"BH8KOJJg29xBQoHG3fVv8cQnabq2NroDbYSgXSzoZeiFmZXKTK7iDBnCHLFynQxgKkjQjeMioOTO0P0bPKf6Rn8\",\"auth\":\"YY7qCrl2kVlWzEik2kBtxg\"}}'),
(5, 3, '{\"endpoint\":\"https://fcm.googleapis.com/fcm/send/flTIxAZcZVo:APA91bHLVYYNIZNTAgkRVTagsXWnAvtrkWAJ19AnXLLET1cbfXd1Q6SoIBX7K-gccPxNGSuhoBtXn_-yEd5FZuu9Uez1HKjqC7U9nY--2eEIpNRnIX5yRBBK1rk-06sV8TfYly5YlFF_\",\"expirationTime\":null,\"keys\":{\"p256dh\":\"BL_s6b32H2I6NOOhtjmzuWflTrSfbjzHJ4D1649MTaab-806aXuXG1XAvU8nMUfpxeZO6PZtawUi8Jq2iYcWQMU\",\"auth\":\"p0lWsY4Av34uUDNcwvqIHQ\"}}'),
(6, 3, '{\"endpoint\":\"https://fcm.googleapis.com/fcm/send/ctgBJzXPcCc:APA91bHulE9PaCsR5vBkZThQ9hHz59v5FexY_8C5Sz4GXu-Zn4bpPi2dCsD1EZbzoi5UA2PMo4cEHZ-XiWQnuqdxkOqq2v9gVG3zYAUTlb1TY-jBucoXkWZsT_nkQLcnddhAov0DZY58\",\"expirationTime\":null,\"keys\":{\"p256dh\":\"BLR02iyn8tV8IArTHxq3zLjcSHG6sjeORVMal_ihHILTOPrli3gobihsce7e65dvwGBdemqRx8LTYxAeCokjPiE\",\"auth\":\"uhSFVjRahnZh5kzuKtRc5Q\"}}');

-- --------------------------------------------------------

--
-- Table structure for table `reels`
--

CREATE TABLE `reels` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `video_url` varchar(255) NOT NULL,
  `caption` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reels`
--

INSERT INTO `reels` (`id`, `user_id`, `video_url`, `caption`, `created_at`) VALUES
(1, 2, '/uploads/1772464781471.mov', 'Basanapur', '2026-03-02 15:19:42'),
(2, 2, '/uploads/1772469085621.mov', '', '2026-03-02 16:31:27');

-- --------------------------------------------------------

--
-- Table structure for table `reel_likes`
--

CREATE TABLE `reel_likes` (
  `id` int(11) NOT NULL,
  `reel_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reel_likes`
--

INSERT INTO `reel_likes` (`id`, `reel_id`, `user_id`) VALUES
(4, 1, 2),
(1, 1, 3),
(5, 1, 4),
(6, 2, 4);

-- --------------------------------------------------------

--
-- Table structure for table `stories`
--

CREATE TABLE `stories` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `media_url` varchar(255) NOT NULL,
  `media_type` enum('image','video') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `caption` varchar(255) DEFAULT NULL,
  `filter_class` varchar(100) DEFAULT 'none',
  `song_name` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stories`
--

INSERT INTO `stories` (`id`, `user_id`, `media_url`, `media_type`, `created_at`, `caption`, `filter_class`, `song_name`) VALUES
(1, 2, '/uploads/1772372319920.jpg', 'image', '2026-03-01 13:38:39', NULL, 'none', NULL),
(2, 3, '/uploads/1772374114409.jpg', 'image', '2026-03-01 14:08:34', NULL, 'brightness(1.1) contrast(1.1) sepia(0.3) hue-rotate(-20deg)', NULL),
(3, 2, '/uploads/1772461638342.jpeg', 'image', '2026-03-02 14:27:18', 'patan', 'none', NULL),
(4, 2, '/uploads/1772522503116.jpg', 'image', '2026-03-03 07:21:43', 'Yo', 'none', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `story_likes`
--

CREATE TABLE `story_likes` (
  `id` int(11) NOT NULL,
  `story_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `story_likes`
--

INSERT INTO `story_likes` (`id`, `story_id`, `user_id`) VALUES
(5, 1, 2),
(4, 1, 3),
(6, 3, 4),
(7, 4, 4);

-- --------------------------------------------------------

--
-- Table structure for table `story_views`
--

CREATE TABLE `story_views` (
  `id` int(11) NOT NULL,
  `story_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `story_views`
--

INSERT INTO `story_views` (`id`, `story_id`, `user_id`) VALUES
(4, 1, 2),
(1, 1, 3),
(5, 2, 2),
(2, 2, 3),
(11, 3, 2),
(10, 3, 4),
(15, 4, 2),
(17, 4, 4);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `profile_pic_url` text DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_private` tinyint(1) DEFAULT 0,
  `notifications` tinyint(1) DEFAULT 1,
  `cover_pic_url` varchar(255) DEFAULT NULL,
  `theme_color` varchar(20) DEFAULT '#3b82f6',
  `anthem_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `profile_pic_url`, `bio`, `created_at`, `is_private`, `notifications`, `cover_pic_url`, `theme_color`, `anthem_url`) VALUES
(1, 'superadmin', 'admin@superapp.com', '$2b$10$doDr486qni7bVdQke.ftr.unL6Qort6uk/fkOffd/OqCQITQyT77G', NULL, NULL, '2026-03-01 05:34:21', 0, 1, NULL, '#3b82f6', NULL),
(2, 'Salon', 'sodarisalon26@gmail.com', '$2b$10$Thk2x6seHMv5XsF7kvybxeRqrBhs/Xvg.CCp3tyvz63lt5NMoAKfK', '/uploads/1772365086424.jpg', '', '2026-03-01 10:26:58', 0, 1, '/uploads/1772527051856.gif', '#3b82f6', 'https://youtu.be/D-0UofHeFdc?si=n2Y3QcOn1l-nw7tS'),
(3, 'Anjal', 'salonsodari05@gmail.com', '$2b$10$kkLsx5syDt7tPavMGjDqzeIl1BFooRlDy0WfW9DuRGAtnkmgHhEKu', '/uploads/1772365034276.jpg', '', '2026-03-01 10:53:40', 0, 1, NULL, '#3b82f6', NULL),
(4, 'Monika Rawal', 'monikarawal0711@gmail.com', '$2b$10$eBzE3tQsPMPqQDyT.qxE8.ym0/nfGAvCqD7b0CyQexh3vZryKNAJa', '/uploads/1772460284430.jpg', '', '2026-03-02 14:01:47', 1, 1, '/uploads/1772460284468.jpg', '#3b82f6', NULL),
(5, 'RAI Raju', 'rajurai.greentech@gmail.com', '$2b$10$vACBSl7SU9VU94AdJApwsehxv2DXIG3j9wfgKiallWp36Cupe9dva', '/uploads/1772505256306.jpg', '', '2026-03-03 02:32:26', 0, 1, NULL, '#3b82f6', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `post_id` (`post_id`);

--
-- Indexes for table `communities`
--
ALTER TABLE `communities`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `creator_id` (`creator_id`);

--
-- Indexes for table `community_members`
--
ALTER TABLE `community_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `community_id` (`community_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `community_posts`
--
ALTER TABLE `community_posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `community_id` (`community_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `community_post_comments`
--
ALTER TABLE `community_post_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `post_id` (`post_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `community_post_likes`
--
ALTER TABLE `community_post_likes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `post_id` (`post_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `connections`
--
ALTER TABLE `connections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `requester_id` (`requester_id`),
  ADD KEY `receiver_id` (`receiver_id`);

--
-- Indexes for table `likes`
--
ALTER TABLE `likes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`,`post_id`),
  ADD KEY `post_id` (`post_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sender_id` (`sender_id`),
  ADD KEY `receiver_id` (`receiver_id`),
  ADD KEY `reply_to_id` (`reply_to_id`);

--
-- Indexes for table `posts`
--
ALTER TABLE `posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `reels`
--
ALTER TABLE `reels`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `reel_likes`
--
ALTER TABLE `reel_likes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reel_id` (`reel_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `stories`
--
ALTER TABLE `stories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `story_likes`
--
ALTER TABLE `story_likes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `story_id` (`story_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `story_views`
--
ALTER TABLE `story_views`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `story_id` (`story_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `comments`
--
ALTER TABLE `comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `communities`
--
ALTER TABLE `communities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `community_members`
--
ALTER TABLE `community_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `community_posts`
--
ALTER TABLE `community_posts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `community_post_comments`
--
ALTER TABLE `community_post_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `community_post_likes`
--
ALTER TABLE `community_post_likes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `connections`
--
ALTER TABLE `connections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `likes`
--
ALTER TABLE `likes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=72;

--
-- AUTO_INCREMENT for table `posts`
--
ALTER TABLE `posts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `reels`
--
ALTER TABLE `reels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `reel_likes`
--
ALTER TABLE `reel_likes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `stories`
--
ALTER TABLE `stories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `story_likes`
--
ALTER TABLE `story_likes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `story_views`
--
ALTER TABLE `story_views`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `comments`
--
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `communities`
--
ALTER TABLE `communities`
  ADD CONSTRAINT `communities_ibfk_1` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `community_members`
--
ALTER TABLE `community_members`
  ADD CONSTRAINT `community_members_ibfk_1` FOREIGN KEY (`community_id`) REFERENCES `communities` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `community_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `community_posts`
--
ALTER TABLE `community_posts`
  ADD CONSTRAINT `community_posts_ibfk_1` FOREIGN KEY (`community_id`) REFERENCES `communities` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `community_posts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `community_post_comments`
--
ALTER TABLE `community_post_comments`
  ADD CONSTRAINT `community_post_comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `community_posts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `community_post_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `community_post_likes`
--
ALTER TABLE `community_post_likes`
  ADD CONSTRAINT `community_post_likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `community_posts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `community_post_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `connections`
--
ALTER TABLE `connections`
  ADD CONSTRAINT `connections_ibfk_1` FOREIGN KEY (`requester_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `connections_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `likes`
--
ALTER TABLE `likes`
  ADD CONSTRAINT `likes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `likes_ibfk_2` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`reply_to_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `posts`
--
ALTER TABLE `posts`
  ADD CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  ADD CONSTRAINT `push_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reels`
--
ALTER TABLE `reels`
  ADD CONSTRAINT `reels_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reel_likes`
--
ALTER TABLE `reel_likes`
  ADD CONSTRAINT `reel_likes_ibfk_1` FOREIGN KEY (`reel_id`) REFERENCES `reels` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reel_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stories`
--
ALTER TABLE `stories`
  ADD CONSTRAINT `stories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `story_likes`
--
ALTER TABLE `story_likes`
  ADD CONSTRAINT `story_likes_ibfk_1` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `story_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `story_views`
--
ALTER TABLE `story_views`
  ADD CONSTRAINT `story_views_ibfk_1` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `story_views_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
