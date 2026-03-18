package com.overseer.repository;

import com.overseer.model.ProjectFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectFileRepository extends JpaRepository<ProjectFile, String> {

    List<ProjectFile> findBySheetId(String sheetId);

    @Query("SELECT f FROM ProjectFile f WHERE f.sheet.id = :sheetId AND f.fileName = :fileName ORDER BY f.version DESC")
    List<ProjectFile> findBySheetIdAndFileNameOrderByVersionDesc(
        @Param("sheetId") String sheetId,
        @Param("fileName") String fileName
    );

    @Query("SELECT f FROM ProjectFile f WHERE f.sheet.id = :sheetId AND f.fileName = :fileName AND f.version = :version")
    Optional<ProjectFile> findBySheetIdAndFileNameAndVersion(
        @Param("sheetId") String sheetId,
        @Param("fileName") String fileName,
        @Param("version") int version
    );

    @Query("SELECT DISTINCT f.fileName FROM ProjectFile f WHERE f.sheet.id = :sheetId")
    List<String> findDistinctFileNamesBySheetId(@Param("sheetId") String sheetId);

    @Query("SELECT MAX(f.version) FROM ProjectFile f WHERE f.sheet.id = :sheetId AND f.fileName = :fileName")
    Integer findMaxVersionBySheetIdAndFileName(
        @Param("sheetId") String sheetId,
        @Param("fileName") String fileName
    );
}
